import os
import sys
import json
import mysql.connector
from mysql.connector import errorcode
from decimal import Decimal
from datetime import date, datetime

def decimal_date_handler(obj):
    """
    JSON serializer for objects not serializable by default json module.
    """
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def fetch_catalog_data(table_name):
    """
    Fetch all data from a catalog table.
    
    Args:
        table_name: Name of the table to fetch from
        
    Returns:
        Dictionary with success status and data
    """
    # Database connection parameters
    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "mon_user")
    password = os.getenv("MYSQL_PASSWORD", "motdepasse_user")
    database = os.getenv("MYSQL_DATABASE", "ma_base")

    connection = None
    
    try:
        # Connect to MySQL
        connection = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        cursor = connection.cursor(dictionary=True)
        
        # Check if table exists
        cursor.execute("SHOW TABLES LIKE %s", (table_name,))
        if not cursor.fetchone():
            return {
                "success": False,
                "error": f"Table '{table_name}' does not exist"
            }
        
        # Fetch all data from the table
        query = f"SELECT * FROM `{table_name}` ORDER BY id"
        cursor.execute(query)
        
        rows = cursor.fetchall()
        
        # Convert rows to the expected format
        # Remove id, created_at, source_file columns for frontend display
        products = []
        for row in rows:
            product = {}
            for key, value in row.items():
                # Skip internal columns
                if key.lower() in ['id', 'created_at', 'source_file']:
                    continue
                
                # Convert column names back to original format
                # (e.g., price_before_tnd -> Price Before (TND))
                original_key = key
                
                # Common conversions
                if key == 'brand':
                    original_key = 'Brand'
                elif key == 'product':
                    original_key = 'Product'
                elif key == 'source':
                    original_key = 'Source'
                elif key == 'rayon':
                    original_key = 'Rayon'
                elif key == 'famille':
                    original_key = 'Famille'
                elif key == 'sous_famille':
                    original_key = 'Sous-famille'
                elif key == 'grammage':
                    original_key = 'Grammage'
                elif key == 'price_before_tnd':
                    original_key = 'Price Before (TND)'
                elif key == 'price_after_tnd':
                    original_key = 'Price After (TND)'
                elif key == 'url':
                    original_key = 'URL'
                elif key == 'promo_date_debut':
                    original_key = 'promo_date_debut'
                elif key == 'promo_date_fin':
                    original_key = 'promo_date_fin'
                
                # Format dates back to DD/MM/YYYY if needed
                if isinstance(value, date) and not isinstance(value, datetime):
                    value = value.strftime('%d/%m/%Y')
                
                # Convert Decimal to string for prices
                if isinstance(value, Decimal):
                    value = str(value)
                
                product[original_key] = value
            
            products.append(product)
        
        return {
            "success": True,
            "data": products,
            "count": len(products)
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
    Expects: python fetch_catalog_data.py <table_name>
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python fetch_catalog_data.py <table_name>"
        }))
        sys.exit(1)
    
    table_name = sys.argv[1]
    
    # Fetch the data
    result = fetch_catalog_data(table_name)
    
    # Output result as JSON
    print(json.dumps(result, ensure_ascii=False, default=decimal_date_handler))
    
    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()