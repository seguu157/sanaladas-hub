export interface ExtractedData {
  client_details: {
    company_name: string;
    contact_person: string;
    address: string;
    phone_number: string;
  };
  order_information: {
    event_date: string;
    number_of_attendees: string;
    sales_representative: string;
    meal_times: {
      breakfast: MealTime | null;
      lunch: MealTime | null;
      dinner: MealTime | null;
    };
  };
  packaging_and_tableware: {
    tableware_details: Tableware[];
  };
  product_details: Product[];
}

export interface MealTime {
  preparation_time: string;
  travel_time: string | null;
  delivery_time: string;
  delivery_responsible: string;
}

export interface Tableware {
  item_name: string;
  quantity: string;
}

export interface Product {
  Categoria: string;
  product_name: string;
  quantity: string;
  format: string | null;
  size: string | null;
  packaging: string;
}

export interface Order {
  id: string;
  fileName: string;
  uploadDate: Date;
  pdfFilePath?: string;
  pdfFileSize?: number;
  pdfOriginalName?: string;
  orderName?: string;
  data: ExtractedData;
  completionStatus: {
    tableware: number;
    products: number;
    totalTableware: number;
    totalProducts: number;
  };
  comments: Comment[];
  color?: 'blue' | 'green' | 'yellow' | 'red';
  orderColor?: string;
  orderColors?: string[];
}

export interface Comment {
  id: string;
  text: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isLoading?: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  recipe: string;
  createdAt: Date;
  updatedAt: Date;
}