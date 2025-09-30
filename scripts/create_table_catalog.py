import os
import sys
import json
import re
import mysql.connector
from mysql.connector import errorcode
from datetime import datetime
from pathlib import Path

def sanitize_table_name(filename):
    """
    Convert PDF filename to a valid MySQL table name.
    
    Args:
        filename: Original PDF filename
        
    Returns:
        Sanitized table name following MySQL naming conventions
    """
    # Remove .pdf extension
    name = filename.replace('.pdf', '').replace('.PDF', '')
    
    # Replace spaces and special characters with underscores
    name = re.sub(r'[^\w\s-]', '_', name)
    name = re.sub(r'[-\s]+', '_', name)
    
    # Remove accents and special characters
    replacements = {
        'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ÿ': 'y', 'ç': 'c', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'É': 'E', 'È': 'E',
        'Ê': 'E', 'Ë': 'E', 'Î': 'I', 'Ï': 'I', 'Ô': 'O', 'Ö': 'O', 'Ù': 'U',
        'Û': 'U', 'Ü': 'U', 'Ÿ': 'Y', 'Ç': 'C'
    }
    for old_char, new_char in replacements.items():
        name = name.replace(old_char, new_char)
    
    # Remove any remaining non-ASCII characters
    name = re.sub(r'[^\x00-\x7F]+', '_', name)
    
    # Ensure it starts with a letter or underscore (MySQL requirement)
    if name and not re.match(r'^[a-zA-Z_]', name):
        name = 'catalog_' + name
    
    # Limit length (MySQL table names can be max 64 characters)
    if len(name) > 64:
        name = name[:64]
    
    # Remove trailing underscores
    name = name.rstrip('_')
    
    # If empty after all sanitization, use a default name
    if not name:
        name = 'catalog_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Make lowercase (MySQL best practice)
    return name.lower()

def get_mysql_type_for_field(field_name, sample_value):
    """
    Determine appropriate MySQL column type based on field name and sample value.
    
    Args:
        field_name: Name of the field
        sample_value: Sample value from the JSON data
        
    Returns:
        MySQL column type definition
    """
    field_lower = field_name.lower()
    
    # Date fields
    if 'date' in field_lower:
        return 'DATE'
    
    # Price fields
    if 'price' in field_lower or 'prix' in field_lower:
        return 'DECIMAL(10, 3)'  # Supports up to 9,999,999.999 TND
    
    # URL fields
    if 'url' in field_lower or 'link' in field_lower:
        return 'TEXT'
    
    # Check sample value if available
    if sample_value is not None:
        # Try to detect if it's a number
        if isinstance(sample_value, (int, float)):
            return 'DECIMAL(10, 3)'
        
        # For strings, check length
        str_value = str(sample_value)
        if len(str_value) > 255:
            return 'TEXT'
    
    # Default to VARCHAR(255)
    return 'VARCHAR(255)'

def parse_date_string(date_str):
    """
    Parse date string in format DD/MM/YYYY to MySQL DATE format YYYY-MM-DD.
    
    Args:
        date_str: Date string in format DD/MM/YYYY or similar
        
    Returns:
        Date string in MySQL format or None if parsing fails
    """
    if not date_str or date_str in ['null', 'None', '-']:
        return None
    
    try:
        # Handle DD/MM/YYYY format
        if '/' in str(date_str):
            parts = str(date_str).split('/')
            if len(parts) == 3:
                day, month, year = parts
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        # Handle DD-MM-YYYY format
        if '-' in str(date_str) and str(date_str).count('-') == 2:
            parts = str(date_str).split('-')
            if len(parts) == 3 and len(parts[0]) <= 2:  # Day is first
                day, month, year = parts
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    except Exception as e:
        print(f"Warning: Could not parse date '{date_str}': {e}", file=sys.stderr)
    
    return None

def create_catalog_table(json_data, pdf_filename):
    """
    Create a MySQL table from catalog JSON data.
    
    Args:
        json_data: List of product dictionaries
        pdf_filename: Name of the PDF file (used for table name)
        
    Returns:
        Dictionary with success status and message
    """
    # Database connection parameters
    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "mon_user")
    password = os.getenv("MYSQL_PASSWORD", "motdepasse_user")
    database = os.getenv("MYSQL_DATABASE", "ma_base")

    connection = None
    
    try:
        # Validate input
        if not json_data or not isinstance(json_data, list):
            return {
                "success": False,
                "error": "Invalid JSON data: expected a list of products"
            }
        
        if not json_data:
            return {
                "success": False,
                "error": "No products found in JSON data"
            }
        
        # Sanitize table name
        table_name = sanitize_table_name(pdf_filename)
        print(f"Creating table: {table_name}", file=sys.stderr)
        
        # Connect to MySQL
        connection = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        cursor = connection.cursor()
        
        # Analyze the JSON structure to determine columns
        # Use the first item as a template
        sample_product = json_data[0]
        columns = []
        
        # Add an auto-increment ID as primary key
        columns.append("id INT AUTO_INCREMENT PRIMARY KEY")
        
        # Create columns based on JSON keys
        for key in sample_product.keys():
            # Sanitize column name
            col_name = re.sub(r'[^\w]', '_', key).lower()
            col_name = re.sub(r'_+', '_', col_name).strip('_')
            
            # Determine column type
            col_type = get_mysql_type_for_field(key, sample_product[key])
            
            columns.append(f"{col_name} {col_type}")
        
        # Add metadata columns
        columns.append("created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        columns.append("source_file VARCHAR(255)")
        
        # Create the table (drop if exists to replace old data)
        drop_table_query = f"DROP TABLE IF EXISTS `{table_name}`"
        cursor.execute(drop_table_query)
        
        create_table_query = f"""
        CREATE TABLE `{table_name}` (
            {', '.join(columns)}
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        cursor.execute(create_table_query)
        print(f"✅ Table '{table_name}' created successfully", file=sys.stderr)
        
        # Insert data
        # Prepare column names for INSERT
        data_columns = [re.sub(r'[^\w]', '_', key).lower() for key in sample_product.keys()]
        data_columns = [re.sub(r'_+', '_', col).strip('_') for col in data_columns]
        
        placeholders = ', '.join(['%s'] * (len(data_columns) + 1))  # +1 for source_file
        columns_str = ', '.join([f"`{col}`" for col in data_columns] + ["`source_file`"])
        
        insert_query = f"""
        INSERT INTO `{table_name}` ({columns_str})
        VALUES ({placeholders})
        """
        
        # Insert each product
        inserted_count = 0
        for product in json_data:
            values = []
            for key in sample_product.keys():
                value = product.get(key)
                
                # Handle date fields
                if 'date' in key.lower() and value:
                    value = parse_date_string(value)
                
                # Handle empty/null values
                if value in ['', 'null', 'None', '-']:
                    value = None
                
                values.append(value)
            
            # Add source file
            values.append(pdf_filename)
            
            try:
                cursor.execute(insert_query, values)
                inserted_count += 1
            except mysql.connector.Error as err:
                print(f"Warning: Failed to insert product: {err}", file=sys.stderr)
                print(f"Product data: {product}", file=sys.stderr)
                # Continue with other products
        
        connection.commit()
        print(f"✅ Inserted {inserted_count} products into '{table_name}'", file=sys.stderr)
        
        return {
            "success": True,
            "table_name": table_name,
            "products_inserted": inserted_count,
            "message": f"Successfully created table '{table_name}' and inserted {inserted_count} products"
        }
        
    except mysql.connector.Error as err:
        error_msg = f"Database error: {err}"
        print(f"❌ {error_msg}", file=sys.stderr)
        return {
            "success": False,
            "error": error_msg
        }
    
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"❌ {error_msg}", file=sys.stderr)
        return {
            "success": False,
            "error": error_msg
        }
    
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

def main():
    """
    Main function to process command line arguments.
    Expects: python create_table_catalog.py <json_file_or_string> <pdf_filename>
    """
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python create_table_catalog.py <json_file_or_string> <pdf_filename>"
        }))
        sys.exit(1)
    
    json_input = sys.argv[1]
    pdf_filename = sys.argv[2]
    
    # Try to parse as JSON string first, then as file path
    try:
        if os.path.isfile(json_input):
            with open(json_input, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
        else:
            json_data = json.loads(json_input)
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Error reading input: {str(e)}"
        }))
        sys.exit(1)
    
    # Create the table
    result = create_catalog_table(json_data, pdf_filename)
    
    # Output result as JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()