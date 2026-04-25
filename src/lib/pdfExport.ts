import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '../types';

export const exportClientInfoToPDF = (order: Order) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Banner azul superior más compacto
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageWidth, 10, 'F');

  // Título
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('Cliente e Información', pageWidth / 2, 6.5, { align: 'center' });

  let yPos = 18;

  // Sección: Datos del Cliente más compacta
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(15, yPos - 2, pageWidth - 30, 6, 1.5, 1.5, 'F');

  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.setFont(undefined, 'bold');
  doc.text('Datos del Cliente', 20, yPos + 1.5);
  yPos += 9;

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont(undefined, 'normal');

  const clientDetails = [
    { label: 'Empresa:', value: order.data?.client_details?.company_name || 'N/A' },
    { label: 'Contacto:', value: order.data?.client_details?.contact_person || 'N/A' },
    { label: 'Dirección:', value: order.data?.client_details?.address || 'N/A' },
    { label: 'Teléfono:', value: order.data?.client_details?.phone_number || 'N/A' },
  ];

  clientDetails.forEach(({ label, value }) => {
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(label, 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(value, pageWidth - 65);
    doc.text(lines, 55, yPos);
    yPos += lines.length * 4.5;
  });

  yPos += 5;

  // Sección: Información del Evento más compacta
  doc.setFillColor(254, 243, 199); // amber-100
  doc.roundedRect(15, yPos - 2, pageWidth - 30, 6, 1.5, 1.5, 'F');

  doc.setFontSize(11);
  doc.setTextColor(146, 64, 14); // amber-900
  doc.setFont(undefined, 'bold');
  doc.text('Información del Evento', 20, yPos + 1.5);
  yPos += 9;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const eventDetails = [
    { label: 'Fecha del Evento:', value: order.data?.order_information?.event_date || 'N/A' },
    { label: 'Asistentes:', value: String(order.data?.order_information?.number_of_attendees || 'N/A') },
    { label: 'Representante:', value: order.data?.order_information?.sales_representative || 'N/A' },
  ];

  eventDetails.forEach(({ label, value }) => {
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(label, 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(value, 65, yPos);
    yPos += 5;
  });

  yPos += 5;

  // Sección: Horarios de Comida - MÁS PROMINENTE Y COMPACTA
  const mealTimes = order.data?.order_information?.meal_times;
  const activeMeals = mealTimes ? Object.entries(mealTimes).filter(([_, meal]) => meal && meal.delivery_time) : [];

  if (activeMeals.length > 0) {
    doc.setFillColor(220, 252, 231); // green-100
    doc.roundedRect(15, yPos - 2, pageWidth - 30, 6, 1.5, 1.5, 'F');

    doc.setFontSize(11);
    doc.setTextColor(20, 83, 45); // green-900
    doc.setFont(undefined, 'bold');
    doc.text('⏰ HORARIOS DE COMIDA', 20, yPos + 1.5);
    yPos += 9;

    const mealTypeNames: Record<string, string> = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena'
    };

    activeMeals.forEach(([mealType, meal]: [string, any]) => {
      if (meal && meal.delivery_time) {
        // Nombre de la comida
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(21, 128, 61); // green-700
        doc.text(mealTypeNames[mealType] || mealType, 20, yPos);
        yPos += 5;

        // Horario de preparación (primero y MÁS GRANDE)
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105);
        if (meal.preparation_time) {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(`⚡ Preparación: ${meal.preparation_time}`, 25, yPos);
          yPos += 5.5;
        }

        // Horario de entrega (después y más pequeño)
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`→ Entrega: ${meal.delivery_time}`, 25, yPos);
        yPos += 5;

        yPos += 2;
      }
    });
  }

  // Footer con nombre del archivo
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont(undefined, 'normal');
  doc.text(`Archivo: ${order.fileName}`, pageWidth / 2, 285, { align: 'center' });

  const fileName = `${order.fileName}_cliente_info.pdf`;
  doc.save(fileName);
};

export const exportProductsAndTablewareToPDF = (order: Order) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Banner rojo superior más compacto
  doc.setFillColor(220, 38, 38); // red-600
  doc.rect(0, 0, pageWidth, 18, 'F');

  // Título
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('Productos y Vajilla', pageWidth / 2, 7, { align: 'center' });

  // Información del pedido
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'normal');
  doc.text(`${order.data?.client_details?.company_name || 'N/A'}`, pageWidth / 2, 12, { align: 'center' });

  // Horarios de comida en el banner
  const mealTimes = order.data?.order_information?.meal_times;
  const activeMeals = mealTimes ? Object.entries(mealTimes).filter(([_, meal]) => meal && meal.delivery_time) : [];

  if (activeMeals.length > 0) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    const mealTypeNames: Record<string, string> = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena'
    };

    const scheduleText = activeMeals.map(([mealType, meal]: [string, any]) => {
      const name = mealTypeNames[mealType] || mealType;
      if (meal.preparation_time) {
        return `${name}: Prep ${meal.preparation_time} → Entrega ${meal.delivery_time}`;
      }
      return `${name}: ${meal.delivery_time}`;
    }).join(' | ');

    doc.text(scheduleText, pageWidth / 2, 16, { align: 'center' });
  }

  let yPos = 24;

  const products = order.data?.product_details || [];
  const tableware = order.data?.tableware || [];

  // Colores por categoría
  const categoryColors: Record<string, { r: number; g: number; b: number }> = {
    'Entrante': { r: 220, g: 252, b: 231 },      // green-100
    'Platos preparados': { r: 191, g: 219, b: 254 },  // blue-100
    'Ensaladas': { r: 187, g: 247, b: 208 },     // emerald-100
    'Postres': { r: 252, g: 231, b: 243 },       // pink-100
    'Bebidas': { r: 207, g: 250, b: 254 },       // cyan-100
    'Sopas': { r: 254, g: 202, b: 202 },         // rose-100
    'Transporte': { r: 241, g: 245, b: 249 },    // slate-100
    'Bolleria': { r: 254, g: 243, b: 199 },      // amber-100
    'Snacks': { r: 254, g: 249, b: 195 },        // yellow-100
  };

  // Agrupar productos por categoría
  const groupedProducts: Record<string, any[]> = {};
  products.forEach((product: any) => {
    const category = product.category || 'Sin categoría';
    if (!groupedProducts[category]) {
      groupedProducts[category] = [];
    }
    groupedProducts[category].push(product);
  });

  // Resumen de productos más compacto
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(15, yPos - 2, pageWidth - 30, 6, 1.5, 1.5, 'F');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont(undefined, 'bold');
  doc.text('Productos del Pedido', 20, yPos + 1.5);

  const totalQuantity = products.reduce((sum: number, p: any) => sum + (parseInt(p.quantity) || 0), 0);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont(undefined, 'normal');
  doc.text(`${Object.keys(groupedProducts).length} categorías • ${products.length} productos • ${totalQuantity} uds`, 20, yPos + 4.5);
  yPos += 10;

  // Renderizar productos por categoría
  Object.entries(groupedProducts).forEach(([category, categoryProducts]) => {
    // Verificar espacio para nueva categoría
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 15;
    }

    const color = categoryColors[category] || { r: 241, g: 245, b: 249 };

    // Encabezado de categoría más compacto
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(15, yPos - 2, pageWidth - 30, 6, 1.5, 1.5, 'F');

    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');

    const categoryQuantity = categoryProducts.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
    doc.text(category, 20, yPos + 1.5);
    doc.text(`${categoryQuantity} uds`, pageWidth - 35, yPos + 1.5);
    yPos += 8;

    // Productos de la categoría más compactos
    categoryProducts.forEach((product: any) => {
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.setFont(undefined, 'normal');

      // Nombre del producto
      const productName = product.product_name || 'N/A';
      const lines = doc.splitTextToSize(productName, pageWidth - 70);
      doc.text(lines, 22, yPos);

      // Cantidad
      doc.setFont(undefined, 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`${product.quantity || 0}`, pageWidth - 30, yPos);

      yPos += lines.length * 4 + 1;

      // Detalles adicionales más compactos
      if (product.format || product.size) {
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont(undefined, 'normal');
        const details = [];
        if (product.format) details.push(product.format);
        if (product.size) details.push(product.size);
        doc.text(details.join(' • '), 22, yPos);
        yPos += 3.5;
      }

      yPos += 1.5;
    });

    yPos += 4;
  });

  // Sección de Vajilla (si existe) más compacta
  if (tableware && tableware.length > 0) {
    if (yPos > pageHeight - 35) {
      doc.addPage();
      yPos = 15;
    }

    yPos += 3;
    doc.setFillColor(254, 243, 199); // amber-100
    doc.roundedRect(15, yPos - 2, pageWidth - 30, 6, 1.5, 1.5, 'F');
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14);
    doc.setFont(undefined, 'bold');
    doc.text('Vajilla', 20, yPos + 1.5);

    const totalTableware = tableware.reduce((sum: number, t: any) => sum + (parseInt(t.quantity) || 0), 0);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'normal');
    doc.text(`${tableware.length} items • ${totalTableware} uds`, 20, yPos + 4.5);
    yPos += 10;

    tableware.forEach((item: any) => {
      if (yPos > pageHeight - 12) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.setFont(undefined, 'normal');
      doc.text(item.item_name || 'N/A', 22, yPos);

      doc.setFont(undefined, 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`${item.quantity || 0}`, pageWidth - 30, yPos);

      yPos += 5;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont(undefined, 'normal');
  doc.text(`Archivo: ${order.fileName}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  const fileName = `${order.fileName}_productos_vajilla.pdf`;
  doc.save(fileName);
};

export const exportCompletePDF = (order: Order) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - (margin * 2);

  // Colores del dashboard
  const colors = {
    primary: { r: 59, g: 130, b: 246 },      // blue-600
    primaryLight: { r: 239, g: 246, b: 255 }, // blue-50
    success: { r: 34, g: 197, b: 94 },       // green-500
    successLight: { r: 220, g: 252, b: 231 }, // green-100
    amber: { r: 245, g: 158, b: 11 },        // amber-500
    amberLight: { r: 254, g: 243, b: 199 },  // amber-100
    slate: { r: 100, g: 116, b: 139 },       // slate-500
    slateLight: { r: 241, g: 245, b: 249 },  // slate-100
    slateDark: { r: 30, g: 41, b: 59 },      // slate-800
  };

  // Mapeo de colores por categoría
  const categoryColors: Record<string, { r: number; g: number; b: number }> = {
    'Entrante': { r: 220, g: 252, b: 231 },
    'Platos preparados': { r: 191, g: 219, b: 254 },
    'Ensaladas': { r: 187, g: 247, b: 208 },
    'Postres': { r: 252, g: 231, b: 243 },
    'Bebidas': { r: 207, g: 250, b: 254 },
    'Sopas': { r: 254, g: 202, b: 202 },
    'Transporte': { r: 241, g: 245, b: 249 },
    'Bolleria': { r: 254, g: 243, b: 199 },
    'Snacks': { r: 254, g: 249, b: 195 },
  };

  let yPos = margin;

  // ===== HEADER PRINCIPAL COMPACTO =====
  doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.rect(0, 0, pageWidth, 14, 'F');

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('PEDIDO COMPLETO', pageWidth / 2, 6, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  const orderDate = new Date(order.uploadDate).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.text(`${orderDate}`, pageWidth / 2, 11, { align: 'center' });

  yPos = 18;

  // ===== DATOS DEL CLIENTE COMPACTO =====
  doc.setFillColor(colors.primaryLight.r, colors.primaryLight.g, colors.primaryLight.b);
  doc.roundedRect(margin, yPos, contentWidth, 6, 1, 1, 'F');

  doc.setFontSize(9);
  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.setFont(undefined, 'bold');
  doc.text('CLIENTE', margin + 3, yPos + 4);
  yPos += 9;

  doc.setFontSize(8);
  doc.setTextColor(colors.slateDark.r, colors.slateDark.g, colors.slateDark.b);

  const clientDetails = [
    { label: 'Empresa:', value: order.data?.client_details?.company_name || 'N/A' },
    { label: 'Contacto:', value: order.data?.client_details?.contact_person || 'N/A' },
    { label: 'Direccion:', value: order.data?.client_details?.address || 'N/A' },
    { label: 'Telefono:', value: order.data?.client_details?.phone_number || 'N/A' },
  ];

  clientDetails.forEach(({ label, value }) => {
    doc.setFont(undefined, 'bold');
    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.text(label, margin + 3, yPos);

    doc.setFont(undefined, 'normal');
    doc.setTextColor(colors.slateDark.r, colors.slateDark.g, colors.slateDark.b);
    const lines = doc.splitTextToSize(value, contentWidth - 35);
    doc.text(lines, margin + 30, yPos);
    yPos += Math.max(lines.length * 3.5, 4);
  });

  yPos += 3;

  // ===== INFORMACION DEL EVENTO COMPACTO =====
  doc.setFillColor(colors.amberLight.r, colors.amberLight.g, colors.amberLight.b);
  doc.roundedRect(margin, yPos, contentWidth, 6, 1, 1, 'F');

  doc.setFontSize(9);
  doc.setTextColor(colors.amber.r, colors.amber.g, colors.amber.b);
  doc.setFont(undefined, 'bold');
  doc.text('EVENTO', margin + 3, yPos + 4);
  yPos += 9;

  doc.setFontSize(8);
  doc.setTextColor(colors.slateDark.r, colors.slateDark.g, colors.slateDark.b);

  const eventDetails = [
    { label: 'Fecha:', value: order.data?.order_information?.event_date || 'N/A' },
    { label: 'Asistentes:', value: String(order.data?.order_information?.number_of_attendees || 'N/A') },
    { label: 'Rep:', value: order.data?.order_information?.sales_representative || 'N/A' },
  ];

  eventDetails.forEach(({ label, value }) => {
    doc.setFont(undefined, 'bold');
    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.text(label, margin + 3, yPos);

    doc.setFont(undefined, 'normal');
    doc.setTextColor(colors.slateDark.r, colors.slateDark.g, colors.slateDark.b);
    doc.text(value, margin + 30, yPos);
    yPos += 4;
  });

  yPos += 2;

  // ===== HORARIOS DE COMIDA COMPACTO =====
  const mealTimes = order.data?.order_information?.meal_times;
  const activeMeals = mealTimes ? Object.entries(mealTimes).filter(([_, meal]) => meal && meal.delivery_time) : [];

  if (activeMeals.length > 0) {
    doc.setFillColor(colors.successLight.r, colors.successLight.g, colors.successLight.b);
    doc.roundedRect(margin, yPos, contentWidth, 6, 1, 1, 'F');

    doc.setFontSize(9);
    doc.setTextColor(colors.success.r, colors.success.g, colors.success.b);
    doc.setFont(undefined, 'bold');
    doc.text('HORARIOS', margin + 3, yPos + 4);
    yPos += 9;

    doc.setFontSize(8);

    const mealTypeNames: Record<string, string> = {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena'
    };

    activeMeals.forEach(([mealType, meal]: [string, any]) => {
      if (meal && meal.delivery_time) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(colors.success.r, colors.success.g, colors.success.b);
        doc.text(mealTypeNames[mealType] || mealType, margin + 3, yPos);

        doc.setFont(undefined, 'normal');
        doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);

        if (meal.preparation_time) {
          doc.text(`Prep: ${meal.preparation_time} | Entrega: ${meal.delivery_time}`, margin + 30, yPos);
        } else {
          doc.text(`Entrega: ${meal.delivery_time}`, margin + 30, yPos);
        }

        yPos += 4;
      }
    });

    yPos += 2;
  }

  // Verificar si necesitamos nueva página
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  yPos += 2;

  // ===== PRODUCTOS COMPACTO =====
  const products = order.data?.product_details || [];
  const groupedProducts: Record<string, any[]> = {};

  products.forEach((product: any) => {
    const category = product.Categoria || product.category || 'Sin categoría';
    if (!groupedProducts[category]) {
      groupedProducts[category] = [];
    }
    groupedProducts[category].push(product);
  });

  doc.setFillColor(colors.slateLight.r, colors.slateLight.g, colors.slateLight.b);
  doc.roundedRect(margin, yPos, contentWidth, 6, 1, 1, 'F');

  doc.setFontSize(9);
  doc.setTextColor(colors.slateDark.r, colors.slateDark.g, colors.slateDark.b);
  doc.setFont(undefined, 'bold');
  doc.text('PRODUCTOS', margin + 3, yPos + 4);

  const totalQuantity = products.reduce((sum: number, p: any) => sum + (parseInt(p.quantity) || 0), 0);
  doc.setFontSize(7);
  doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
  doc.setFont(undefined, 'normal');
  doc.text(`${Object.keys(groupedProducts).length} cat - ${products.length} prod - ${totalQuantity} uds`, pageWidth - margin - 3, yPos + 4, { align: 'right' });
  yPos += 9;

  // Renderizar productos por categoría COMPACTO
  Object.entries(groupedProducts).forEach(([category, categoryProducts]) => {
    if (yPos > pageHeight - 25) {
      doc.addPage();
      yPos = margin;
    }

    const color = categoryColors[category] || colors.slateLight;
    const categoryQuantity = categoryProducts.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

    // Header de categoría compacto
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(margin + 2, yPos - 1.5, contentWidth - 4, 5, 1, 1, 'F');

    doc.setFontSize(8);
    doc.setTextColor(colors.slateDark.r, colors.slateDark.g, colors.slateDark.b);
    doc.setFont(undefined, 'bold');
    doc.text(category.toUpperCase(), margin + 4, yPos + 2);

    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.text(`${categoryQuantity}`, pageWidth - margin - 4, yPos + 2, { align: 'right' });
    yPos += 6;

    // Productos de la categoría COMPACTO
    categoryProducts.forEach((product: any) => {
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(8);
      doc.setTextColor(colors.slateDark.r, colors.slateDark.g, colors.slateDark.b);
      doc.setFont(undefined, 'normal');

      // Nombre del producto (con wrapping)
      const productName = product.product_name || 'N/A';
      const maxWidth = contentWidth - 35;
      const lines = doc.splitTextToSize(productName, maxWidth);
      doc.text(lines, margin + 6, yPos);

      // Cantidad en negrita a la derecha
      doc.setFont(undefined, 'bold');
      doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
      doc.text(`x${product.quantity || 0}`, pageWidth - margin - 4, yPos, { align: 'right' });

      yPos += lines.length * 3.5;

      // Detalles adicionales ULTRA COMPACTO
      const details = [];
      if (product.format) details.push(product.format);
      if (product.size) details.push(product.size);

      if (details.length > 0) {
        doc.setFontSize(6.5);
        doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
        doc.setFont(undefined, 'normal');
        doc.text(details.join(' • '), margin + 6, yPos);
        yPos += 2.5;
      }

      yPos += 1.5;
    });

    yPos += 3;
  });

  // ===== VAJILLA COMPACTO =====
  const tableware = order.data?.tableware || [];

  if (tableware.length > 0) {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }

    yPos += 2;
    doc.setFillColor(colors.amberLight.r, colors.amberLight.g, colors.amberLight.b);
    doc.roundedRect(margin, yPos, contentWidth, 6, 1, 1, 'F');

    doc.setFontSize(9);
    doc.setTextColor(colors.amber.r, colors.amber.g, colors.amber.b);
    doc.setFont(undefined, 'bold');
    doc.text('VAJILLA', margin + 3, yPos + 4);

    const totalTableware = tableware.reduce((sum: number, t: any) => sum + (parseInt(t.quantity) || 0), 0);
    doc.setFontSize(7);
    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.setFont(undefined, 'normal');
    doc.text(`${tableware.length} items - ${totalTableware} uds`, pageWidth - margin - 3, yPos + 4, { align: 'right' });
    yPos += 9;

    tableware.forEach((item: any) => {
      if (yPos > pageHeight - 12) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(8);
      doc.setTextColor(colors.slateDark.r, colors.slateDark.g, colors.slateDark.b);
      doc.setFont(undefined, 'normal');
      doc.text(item.item_name || 'N/A', margin + 6, yPos);

      doc.setFont(undefined, 'bold');
      doc.setTextColor(colors.amber.r, colors.amber.g, colors.amber.b);
      doc.text(`x${item.quantity || 0}`, pageWidth - margin - 4, yPos, { align: 'right' });

      yPos += 4;
    });
  }

  // ===== FOOTER COMPACTO =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.setFont(undefined, 'normal');
    doc.text(
      `${order.fileName} | ${i}/${pageCount}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const fileName = `${order.fileName}_completo.pdf`;
  doc.save(fileName);
};

// Color palette matching TodaysOrders component - versiones para fondo y círculo
const PDF_COLOR_MAP: Record<string, {
  bg: { r: number; g: number; b: number };
  border: { r: number; g: number; b: number };
  dot: { r: number; g: number; b: number };
  name: string
}> = {
  'blue': {
    bg: { r: 219, g: 234, b: 254 },      // blue-100
    border: { r: 147, g: 197, b: 253 },  // blue-300
    dot: { r: 59, g: 130, b: 246 },      // blue-500
    name: 'Azul'
  },
  'green': {
    bg: { r: 220, g: 252, b: 231 },      // green-100
    border: { r: 134, g: 239, b: 172 },  // green-300
    dot: { r: 34, g: 197, b: 94 },       // green-500
    name: 'Verde'
  },
  'red': {
    bg: { r: 254, g: 226, b: 226 },      // red-100
    border: { r: 252, g: 165, b: 165 },  // red-300
    dot: { r: 239, g: 68, b: 68 },       // red-500
    name: 'Rojo'
  },
  'yellow': {
    bg: { r: 254, g: 249, b: 195 },      // yellow-100
    border: { r: 253, g: 224, b: 71 },   // yellow-300
    dot: { r: 234, g: 179, b: 8 },       // yellow-500
    name: 'Amarillo'
  },
  'default': {
    bg: { r: 241, g: 245, b: 249 },      // slate-100
    border: { r: 203, g: 213, b: 225 },  // slate-300
    dot: { r: 100, g: 116, b: 139 },     // slate-500
    name: 'Gris'
  }
};

export const exportTodaysOrdersToPDF = (orders: Order[]) => {
  if (orders.length === 0) {
    alert('No hay pedidos para exportar');
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  // Colores profesionales
  const colors = {
    primary: { r: 37, g: 99, b: 235 },
    primaryLight: { r: 239, g: 246, b: 255 },
    slate800: { r: 30, g: 41, b: 59 },
    slate700: { r: 51, g: 65, b: 85 },
    slate600: { r: 71, g: 85, b: 105 },
    slate500: { r: 100, g: 116, b: 139 },
    slate400: { r: 148, g: 163, b: 184 },
    slate200: { r: 226, g: 232, b: 240 },
    slate100: { r: 241, g: 245, b: 249 },
  };

  // ===== HEADER COMPACTO =====
  doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.rect(0, 0, pageWidth, 16, 'F');

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('PEDIDOS DE HOY', pageWidth / 2, 7, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.text(today.charAt(0).toUpperCase() + today.slice(1), pageWidth / 2, 12, { align: 'center' });

  let yPos = 20;

  // ===== RESUMEN COMPACTO =====
  const totalOrders = orders.length;
  const allProducts = orders.flatMap(o => o.data?.product_details || []);
  const totalProductItems = allProducts.length;
  const totalQuantity = allProducts.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

  doc.setFillColor(colors.slate100.r, colors.slate100.g, colors.slate100.b);
  doc.roundedRect(margin, yPos, contentWidth, 10, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setTextColor(colors.slate800.r, colors.slate800.g, colors.slate800.b);
  doc.setFont(undefined, 'bold');
  doc.text('RESUMEN', margin + 3, yPos + 4);

  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(colors.slate600.r, colors.slate600.g, colors.slate600.b);
  doc.text(`${totalOrders} pedidos`, margin + 3, yPos + 7.5);
  doc.text(`${totalProductItems} productos`, margin + 25, yPos + 7.5);
  doc.text(`${totalQuantity} unidades`, margin + 52, yPos + 7.5);

  yPos += 12;

  // ===== TARJETAS DE PEDIDOS =====
  doc.setFillColor(colors.slate100.r, colors.slate100.g, colors.slate100.b);
  doc.roundedRect(margin, yPos, contentWidth, 5.5, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(colors.slate800.r, colors.slate800.g, colors.slate800.b);
  doc.text('PEDIDOS DEL DÍA', margin + 2, yPos + 3.8);

  yPos += 7;

  // Renderizar tarjetas de pedidos
  let cardX = margin;
  let cardY = yPos;
  const cardWidth = 42;
  const cardHeight = 7;
  const cardGap = 1.5;
  const cardsPerRow = Math.floor(contentWidth / (cardWidth + cardGap));

  orders.forEach((order, idx) => {
    // Saltar a nueva fila si no hay espacio
    if (idx > 0 && idx % cardsPerRow === 0) {
      cardX = margin;
      cardY += cardHeight + cardGap;
    }

    // Verificar si necesitamos nueva página
    if (cardY + cardHeight > pageHeight - 20) {
      doc.addPage();
      cardY = 15;
      cardX = margin;
    }

    const orderColors = order.orderColors || (order.orderColor ? [order.orderColor] : ['default']);
    const colorInfoArray = orderColors.map(colorStr => PDF_COLOR_MAP[colorStr] || PDF_COLOR_MAP['default']);
    const primaryColor = colorInfoArray[0];

    // Fondo de la tarjeta con color del pedido
    doc.setFillColor(primaryColor.bg.r, primaryColor.bg.g, primaryColor.bg.b);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');

    // Borde con color más oscuro
    doc.setDrawColor(primaryColor.border.r, primaryColor.border.g, primaryColor.border.b);
    doc.setLineWidth(0.8);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

    // Círculos de colores
    let circleX = cardX + 1.5;
    colorInfoArray.forEach((colorInfo) => {
      // Círculo con color vibrante
      doc.setFillColor(colorInfo.dot.r, colorInfo.dot.g, colorInfo.dot.b);
      doc.circle(circleX, cardY + 2, 1, 'F');

      // Borde blanco para destacar
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.circle(circleX, cardY + 2, 1, 'S');

      circleX += 2.3;
    });

    // Nombre de la empresa
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(colors.slate800.r, colors.slate800.g, colors.slate800.b);
    const companyName = order.data?.client_details?.company_name || 'Sin nombre';
    const maxNameW = cardWidth - 3;
    const companyDisplay = companyName.length > 22 ? companyName.substring(0, 19) + '...' : companyName;
    doc.text(companyDisplay, cardX + 1.5, cardY + 4.5);

    // Número de asistentes
    doc.setFontSize(5.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(colors.slate600.r, colors.slate600.g, colors.slate600.b);
    const attendees = order.data?.order_information?.number_of_attendees || '0';
    doc.text(`(${attendees}p)`, cardX + 1.5, cardY + 6.2);

    cardX += cardWidth + cardGap;
  });

  yPos = cardY + cardHeight + 4;

  // Agrupar productos por categoría de todos los pedidos
  const productSummary: Record<string, {
    productName: string;
    category: string;
    totalQuantity: number;
    format?: string;
    size?: string;
    packaging?: string;
    orderDetails: Array<{
      companyName: string;
      quantity: number;
      colors: Array<{ r: number; g: number; b: number; name: string }>;
      deliveryTime?: string;
    }>;
  }> = {};

  orders.forEach((order, orderIndex) => {
    const products = order.data?.product_details || [];
    const orderColors = order.orderColors || (order.orderColor ? [order.orderColor] : ['default']);
    const colorInfoArray = orderColors.map(colorStr => {
      const colorData = PDF_COLOR_MAP[colorStr] || PDF_COLOR_MAP['default'];
      return colorData.dot; // Usar el color vibrante del círculo
    });
    const companyName = order.data?.client_details?.company_name || 'Sin nombre';

    // Obtener horario de entrega principal
    const mealTimes = order.data?.order_information?.meal_times;
    const activeMeals = mealTimes ? Object.entries(mealTimes).filter(([_, meal]) => meal && meal.delivery_time) : [];
    const deliveryTime = activeMeals.length > 0 ? activeMeals[0][1]?.delivery_time : undefined;

    products.forEach((product: any) => {
      const key = `${product.Categoria || product.category || 'Sin categoría'}_${product.product_name}`;

      if (!productSummary[key]) {
        productSummary[key] = {
          productName: product.product_name || 'N/A',
          category: product.Categoria || product.category || 'Sin categoría',
          totalQuantity: 0,
          format: product.format,
          size: product.size,
          packaging: product.packaging,
          orderDetails: []
        };
      }

      const quantity = parseInt(product.quantity) || 0;
      productSummary[key].totalQuantity += quantity;
      productSummary[key].orderDetails.push({
        companyName,
        quantity,
        colors: colorInfoArray,
        deliveryTime
      });
    });
  });

  // Agrupar por categoría
  const groupedByCategory: Record<string, typeof productSummary> = {};
  Object.entries(productSummary).forEach(([key, value]) => {
    const category = value.category;
    if (!groupedByCategory[category]) {
      groupedByCategory[category] = {};
    }
    groupedByCategory[category][key] = value;
  });

  // Colores de categoría
  const categoryColors: Record<string, { r: number; g: number; b: number }> = {
    'Wrap bites': { r: 191, g: 219, b: 254 },
    'Sandwiches': { r: 254, g: 215, b: 170 },
    'Bebida': { r: 207, g: 250, b: 254 },
    'Dessert': { r: 252, g: 231, b: 243 },
    'Bakery': { r: 254, g: 243, b: 199 },
    'Ensaladas': { r: 187, g: 247, b: 208 },
    'Platos preparados': { r: 221, g: 214, b: 254 },
    'Sopas': { r: 254, g: 202, b: 202 },
  };

  // Renderizar por categoría
  Object.entries(groupedByCategory).forEach(([category, products]) => {
    if (yPos > pageHeight - 35) {
      doc.addPage();
      yPos = 15;
    }

    const catColor = categoryColors[category] || colors.slate200;
    const categoryTotal = Object.values(products).reduce((sum, p) => sum + p.totalQuantity, 0);

    // Título de categoría compacto
    doc.setFillColor(catColor.r, catColor.g, catColor.b);
    doc.roundedRect(margin, yPos, contentWidth, 6, 1.5, 1.5, 'F');

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(colors.slate800.r, colors.slate800.g, colors.slate800.b);
    doc.text(category.toUpperCase(), margin + 2, yPos + 4);

    doc.setFontSize(7);
    doc.setTextColor(colors.slate600.r, colors.slate600.g, colors.slate600.b);
    const totalText = `${categoryTotal} uds`;
    const totalWidth = doc.getTextWidth(totalText);
    doc.text(totalText, pageWidth - margin - totalWidth - 2, yPos + 4);

    yPos += 8;

    // Productos de la categoría
    Object.entries(products).forEach(([_, productInfo]) => {
      const estimatedHeight = 10 + (productInfo.orderDetails.length * 4);
      if (yPos + estimatedHeight > pageHeight - 12) {
        doc.addPage();
        yPos = 12;
      }

      // Línea separadora sutil
      doc.setDrawColor(colors.slate200.r, colors.slate200.g, colors.slate200.b);
      doc.line(margin + 1, yPos, pageWidth - margin - 1, yPos);
      yPos += 2;

      // Nombre del producto y total
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(colors.slate800.r, colors.slate800.g, colors.slate800.b);

      const maxProductWidth = contentWidth - 22;
      const productNameLines = doc.splitTextToSize(productInfo.productName, maxProductWidth);
      doc.text(productNameLines, margin + 1.5, yPos);

      // Total en la misma línea con caja de fondo
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const totalStr = `${productInfo.totalQuantity}`;
      const totalW = doc.getTextWidth(totalStr);
      const boxPadding = 2;
      const boxWidth = totalW + boxPadding * 2;
      const boxHeight = 5;
      const boxX = pageWidth - margin - boxWidth;
      const boxY = yPos - 3.5;

      // Caja de fondo
      doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 1, 1, 'F');

      // Número en blanco
      doc.setTextColor(255, 255, 255);
      doc.text(totalStr, pageWidth - margin - boxPadding - totalW, yPos);

      yPos += productNameLines.length * 3.5 + 0.5;

      // Detalles del producto en una línea compacta
      if (productInfo.format || productInfo.size) {
        doc.setFontSize(6.5);
        doc.setTextColor(colors.slate500.r, colors.slate500.g, colors.slate500.b);
        doc.setFont(undefined, 'normal');
        const details = [];
        if (productInfo.format) details.push(productInfo.format);
        if (productInfo.size) details.push(productInfo.size);
        doc.text(details.join(' • '), margin + 1.5, yPos);
        yPos += 2.8;
      }

      // Detalles de cada pedido - MÁS COMPACTO
      productInfo.orderDetails.forEach((detail) => {
        let xPos = margin + 3;

        // Círculos de colores compactos y vibrantes
        detail.colors.forEach((colorInfo) => {
          doc.setFillColor(colorInfo.r, colorInfo.g, colorInfo.b);
          doc.circle(xPos, yPos + 0.8, 1, 'F');

          // Borde blanco para destacar
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.3);
          doc.circle(xPos, yPos + 0.8, 1, 'S');

          xPos += 2.5;
        });

        xPos += 0.8;

        // Nombre del cliente compacto
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(colors.slate700.r, colors.slate700.g, colors.slate700.b);

        const maxClientW = contentWidth - (xPos - margin) - 32;
        const companyText = detail.companyName.length > 38 ? detail.companyName.substring(0, 35) + '...' : detail.companyName;
        doc.text(companyText, xPos, yPos);

        // Horario primero
        let rightX = pageWidth - margin - 1;
        if (detail.deliveryTime) {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(7);
          doc.setTextColor(colors.slate500.r, colors.slate500.g, colors.slate500.b);
          const timeW = doc.getTextWidth(detail.deliveryTime);
          doc.text(detail.deliveryTime, rightX - timeW, yPos);
          rightX = rightX - timeW - 4;
        }

        // Cantidad con caja de fondo
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        const qtyStr = `${detail.quantity}`;
        const qtyW = doc.getTextWidth(qtyStr);
        const qtyBoxPadding = 1.5;
        const qtyBoxWidth = qtyW + qtyBoxPadding * 2;
        const qtyBoxHeight = 4;
        const qtyBoxX = rightX - qtyBoxWidth;
        const qtyBoxY = yPos - 3;

        // Caja de fondo para cantidad
        doc.setFillColor(colors.slate200.r, colors.slate200.g, colors.slate200.b);
        doc.roundedRect(qtyBoxX, qtyBoxY, qtyBoxWidth, qtyBoxHeight, 0.8, 0.8, 'F');

        // Número de cantidad
        doc.setTextColor(colors.slate800.r, colors.slate800.g, colors.slate800.b);
        doc.text(qtyStr, qtyBoxX + qtyBoxPadding, yPos);

        yPos += 3.5;
      });

      yPos += 2;
    });

    yPos += 1.5;
  });

  // ===== FOOTER COMPACTO =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Línea separadora sutil
    doc.setDrawColor(colors.slate200.r, colors.slate200.g, colors.slate200.b);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    // Texto del footer compacto
    doc.setFontSize(7);
    doc.setTextColor(colors.slate400.r, colors.slate400.g, colors.slate400.b);
    doc.setFont(undefined, 'normal');

    const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const footerText = `${dateStr} • Pág. ${i}/${pageCount}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: 'center' });
  }

  // Guardar PDF
  const fileName = `Pedidos_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
