-- Delete names with ,"[number] suffix that have clean duplicates
DELETE FROM names n1
WHERE n1.name ~ ',"[0-9]+$'
AND EXISTS (
  SELECT 1 FROM names n2 
  WHERE REGEXP_REPLACE(n1.name, ',"[0-9]+$', '') = n2.name
);