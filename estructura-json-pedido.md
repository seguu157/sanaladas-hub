# Estructura JSON para Cargar Pedidos

## Campos Obligatorios

### 1. client_details (Obligatorio)
```json
{
  "company_name": "string",     // Nombre de la empresa
  "contact_person": "string",   // Persona de contacto
  "address": "string",          // Dirección completa
  "phone_number": "string"      // Número de teléfono
}
```

### 2. order_information (Obligatorio)
```json
{
  "event_date": "string",           // Formato: "25 diciembre"
  "number_of_attendees": "string",  // Número como string: "50"
  "sales_representative": "string", // Nombre del representante
  "meal_times": {
    "breakfast": MealTime | null,   // Desayuno (opcional)
    "lunch": MealTime | null,       // Almuerzo (opcional)
    "dinner": MealTime | null       // Cena (opcional)
  }
}
```

#### MealTime (Opcional)
```json
{
  "preparation_time": "string",      // Hora: "08:00"
  "travel_time": "string | null",    // Tiempo viaje: "30 min" o null
  "delivery_time": "string",         // Hora entrega: "09:00"
  "delivery_responsible": "string"   // "nosotros" o "cliente"
}
```

### 3. packaging_and_tableware (Obligatorio)
```json
{
  "tableware_details": [
    {
      "item_name": "string",    // Nombre del artículo
      "quantity": "string"      // Cantidad como string: "50"
    }
  ]
}
```

### 4. product_details (Obligatorio)
```json
[
  {
    "Categoria": "string",        // Categoría del producto
    "product_name": "string",     // Nombre del producto
    "quantity": "string",         // Cantidad como string
    "format": "string | null",    // Formato (opcional)
    "size": "string | null",      // Tamaño (opcional)
    "packaging": "string"         // Tipo de embalaje
  }
]
```

## Categorías Válidas
- "Wrap bites"
- "Sandwiches"
- "Bebida"
- "Dessert"
- "Bakery"

## Formato de Fecha
- Usar formato español: "25 diciembre", "15 enero", etc.
- Solo día y mes, el año se asume como actual

## Notas Importantes
1. **Todas las cantidades** deben ser strings, no números
2. **Los campos opcionales** pueden ser `null`
3. **meal_times** puede tener todos los valores en `null` si no hay horarios
4. **El formato de fecha** debe seguir el patrón español
5. **Las categorías** deben coincidir exactamente con las válidas

## Ejemplo Mínimo
```json
{
  "client_details": {
    "company_name": "Cliente Test",
    "contact_person": "Juan Test",
    "address": "Dirección Test",
    "phone_number": "123456789"
  },
  "order_information": {
    "event_date": "25 diciembre",
    "number_of_attendees": "10",
    "sales_representative": "Vendedor Test",
    "meal_times": {
      "breakfast": null,
      "lunch": null,
      "dinner": null
    }
  },
  "packaging_and_tableware": {
    "tableware_details": []
  },
  "product_details": []
}
```