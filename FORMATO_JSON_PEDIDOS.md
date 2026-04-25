# Formato JSON para Pedidos

## Estructura Actualizada (Sin Vajilla ni Packaging)

El JSON de entrada para los pedidos ahora contiene **ÚNICAMENTE productos**. La vajilla y el packaging se asignan manualmente a través de la interfaz, por lo que **NO deben incluirse en el PDF ni en el JSON extraído**.

### Estructura del JSON

```json
{
  "client_details": {
    "company_name": "string",
    "contact_person": "string",
    "address": "string",
    "phone_number": "string"
  },
  "order_information": {
    "event_date": "string (formato: 'día mes', ej: '1 enero')",
    "number_of_attendees": "string",
    "sales_representative": "string",
    "meal_times": {
      "breakfast": {
        "preparation_time": "string (formato HH:MM)",
        "travel_time": "string | null",
        "delivery_time": "string (formato HH:MM)",
        "delivery_responsible": "string ('nosotros' | 'cliente')"
      } | null,
      "lunch": {
        "preparation_time": "string (formato HH:MM)",
        "travel_time": "string | null",
        "delivery_time": "string (formato HH:MM)",
        "delivery_responsible": "string ('nosotros' | 'cliente')"
      } | null,
      "dinner": {
        "preparation_time": "string (formato HH:MM)",
        "travel_time": "string | null",
        "delivery_time": "string (formato HH:MM)",
        "delivery_responsible": "string ('nosotros' | 'cliente')"
      } | null
    }
  },
  "product_details": [
    {
      "Categoria": "string",
      "product_name": "string",
      "quantity": "string",
      "format": "string | null",
      "size": "string | null"
    }
  ]
}
```

### Cambios Importantes

#### ❌ Secciones ELIMINADAS:
1. **`packaging_and_tableware`**: Ya NO existe en el JSON
2. **`packaging` en productos**: Los productos NO incluyen campo de packaging

#### ✅ Lo que SÍ se extrae del PDF:
- ✅ Detalles del cliente
- ✅ Información del pedido (fecha, comensales, horarios)
- ✅ Productos (nombre, cantidad, formato, tamaño)

#### ✅ Lo que se gestiona MANUALMENTE:
- 📦 Packaging de productos (desde biblioteca)
- 🍴 Vajilla necesaria (selección manual)

### Ejemplo Completo

```json
{
  "client_details": {
    "company_name": "Empresa Ejemplo S.L.",
    "contact_person": "Juan Pérez",
    "address": "Calle Mayor 123, 28001 Madrid",
    "phone_number": "912345678"
  },
  "order_information": {
    "event_date": "1 enero",
    "number_of_attendees": "50",
    "sales_representative": "María García",
    "meal_times": {
      "breakfast": {
        "preparation_time": "08:00",
        "travel_time": "30 min",
        "delivery_time": "09:00",
        "delivery_responsible": "nosotros"
      },
      "lunch": {
        "preparation_time": "12:00",
        "travel_time": "45 min",
        "delivery_time": "13:30",
        "delivery_responsible": "cliente"
      },
      "dinner": null
    }
  },
  "product_details": [
    {
      "Categoria": "Sandwiches",
      "product_name": "Bocadillo de jamón ibérico",
      "quantity": "25",
      "format": "Medio bocadillo",
      "size": "15cm"
    },
    {
      "Categoria": "Wrap bites",
      "product_name": "Wrap de pollo",
      "quantity": "30",
      "format": null,
      "size": null
    },
    {
      "Categoria": "Bebida",
      "product_name": "Agua mineral 1.5L",
      "quantity": "10",
      "format": "Botella",
      "size": "1.5L"
    }
  ]
}
```

### Campos de Productos

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `Categoria` | string | Categoría del producto (Sandwiches, Wraps, Bebida, Dessert, Bakery) | Sí |
| `product_name` | string | Nombre del producto | Sí |
| `quantity` | string | Cantidad solicitada | Sí |
| `format` | string \| null | Formato del producto (ej: "Medio bocadillo", "Mini") | No |
| `size` | string \| null | Tamaño del producto (ej: "15cm", "1.5L") | No |

### Notas Importantes

1. **NO extraer vajilla**: El PDF ya NO debe incluir información de vajilla
2. **NO extraer packaging**: El packaging de productos ya NO se extrae del PDF
3. **Asignación Post-Procesamiento**: Todo el packaging y vajilla se asigna manualmente después
4. **Gestión Manual**:
   - Packaging → Modal de asignación de packaging
   - Vajilla → Selección manual según necesidades

### Flujo de Trabajo

1. 📄 **PDF recibido** → Extraer SOLO: Cliente + Info Pedido + Productos
2. 📦 **Modal de Packaging** → Asignar packaging a cada producto manualmente
3. 🍴 **Vajilla** → Seleccionar vajilla necesaria manualmente
4. 💾 **Base de Datos** → Guardar todas las asignaciones
5. ✅ **Pedido Completo** → Listo para procesar

### Progreso de Pedidos

El progreso del pedido se calcula ahora **ÚNICAMENTE** basado en productos:
- ✅ Cada producto marcado = avance en %
- 🎯 100% completado = todos los productos listos
- La vajilla NO afecta el cálculo de progreso

### Migración de Datos Antiguos

Si tienes pedidos con formato antiguo:
- Ignorar sección `packaging_and_tableware`
- Ignorar campo `packaging` en productos
- Re-asignar packaging y vajilla manualmente
