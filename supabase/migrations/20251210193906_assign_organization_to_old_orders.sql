/*
  # Asignar organización a pedidos antiguos
  
  1. Problema
    - Hay pedidos sin organization_id (pedidos antiguos)
    - Estos pedidos necesitan estar asociados a una organización
    
  2. Solución
    - Asignar la organización principal a todos los pedidos sin organization_id
*/

-- Actualizar pedidos sin organization_id para que tengan la organización principal
UPDATE orders
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;
