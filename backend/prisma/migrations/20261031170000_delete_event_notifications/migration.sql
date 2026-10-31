-- Delete event notifications since event is not yet conducting
DELETE FROM "Notification"
WHERE "type" = 'EVENT'
   OR "id" LIKE 'notif_event_%'
   OR "actionUrl" LIKE '/events/%'
   OR "title" ILIKE '%Spring Boot%'
   OR "message" ILIKE '%Spring Boot%';
