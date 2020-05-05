DROP FUNCTION IF EXISTS snakeToCamelCase;
CREATE FUNCTION IF NOT EXISTS snakeToCamelCase (name TEXT) RETURNS TEXT RETURN
(
	SELECT 
		REPLACE(
			REPLACE(
				REPLACE(
					REPLACE(
						REPLACE(
							REPLACE(
								REPLACE(name, 
									'_i', 'I'), 
									'_l', 'L'), 
									'_o', 'O'), 
									'_g', 'G'), 
									'_m', 'M'), 
									'_r', 'R'), 
									'_u', 'U')
);
	
CREATE FUNCTION IF NOT EXISTS dexieTable(name TEXT) RETURNS TEXT RETURN
(
	SELECT CONCAT( LOWER( SUBSTR(name, 1, 1)), SUBSTR( snakeToCamelCase(name), 2))
);
	
CREATE FUNCTION IF NOT EXISTS dexieInterfaceName(name TEXT) RETURNS TEXT RETURN
(
	SELECT CONCAT( 'DBDI',  UPPER( SUBSTR(name, 1, 1)), SUBSTR( snakeToCamelCase(name), 2))
);
	
 
SELECT 
	CONCAT(dexieTable(c.TABLE_NAME), ': Dexie.Table<', dexieInterfaceName(TABLE_NAME), ', number>;')
 FROM information_schema.`COLUMNS` c 
 WHERE c.TABLE_SCHEMA = 'mt_lumen_inventory' AND c.TABLE_NAME NOT LIKE 'Import_%' AND c.TABLE_NAME NOT LIKE 'migrations'
 GROUP BY c.TABLE_SCHEMA, c.TABLE_NAME
 ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME;
 
SELECT 
	CONCAT( dexieTable(c.TABLE_NAME), ": \n         '++"),  
	GROUP_CONCAT(c.COLUMN_NAME ORDER BY c.ORDINAL_POSITION),
	"',"
 FROM information_schema.`COLUMNS` c 
 WHERE c.TABLE_SCHEMA = 'mt_lumen_inventory' AND c.TABLE_NAME NOT LIKE 'Import_%' AND c.TABLE_NAME NOT LIKE 'migrations'
 GROUP BY c.TABLE_SCHEMA, c.TABLE_NAME
 ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME;
 
WITH fieldInterfaces AS (SELECT 
c.TABLE_NAME,
--	c.COLUMN_NAME, 
--	c.IS_NULLABLE, 
--	c.COLUMN_TYPE, 
--	c.DATA_TYPE, 
--	c.CHARACTER_MAXIMUM_LENGTH,	
--	CASE 
--		WHEN c.DATA_TYPE LIKE '%int' OR c.DATA_TYPE LIKE '%float%' THEN 'number'
--		WHEN c.DATA_TYPE LIKE '%time%' OR c.DATA_TYPE LIKE '%date%' THEN 'Date'
--		ELSE 'string'
--	END JSType,
	
	CONCAT(c.COLUMN_NAME, IF(c.IS_NULLABLE LIKE 'YES', '?: ', ': '), CASE 
		WHEN c.DATA_TYPE LIKE '%int' OR c.DATA_TYPE LIKE '%float%' THEN 'number'
		WHEN c.DATA_TYPE LIKE '%time%' OR c.DATA_TYPE LIKE '%date%' THEN 'Date'
		ELSE 'string'
	END, ';') InterfaceField,
	c.ORDINAL_POSITION
	
 FROM information_schema.`COLUMNS` c 
 WHERE c.TABLE_SCHEMA = 'mt_lumen_inventory' AND c.TABLE_NAME NOT LIKE 'Import_%' AND c.TABLE_NAME NOT LIKE 'migrations'
 ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION
)
SELECT CONCAT('export interface ', dexieInterfaceName(TABLE_NAME), " {\n\t") starter, GROUP_CONCAT(InterfaceField ORDER BY ORDINAL_POSITION SEPARATOR "\n\t"), "\n}\n" closer
FROM fieldInterfaces
GROUP BY TABLE_NAME
;
