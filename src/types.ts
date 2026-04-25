export interface ClientDetails {
  company_name: string;
  contact_person: string;
  address: string;
  phone_number: string;
}

export interface MealTime {
  preparation_time: string;
  travel_time: string | null;
  delivery_time: string;
  delivery_responsible: string;
}

export interface OrderInformation {
  event_date: string;
  number_of_attendees: string;
  sales_representative: string;
  meal_times: {
    breakfast?: MealTime | null;
    lunch?: MealTime | null;
    dinner?: MealTime | null;
    coffee_break?: MealTime | null;
    finger_food?: MealTime | null;
    [key: string]: MealTime | null | undefined;
  };
}

export interface ProductDetail {
  Categoria: string;
  product_name: string;
  quantity: string;
  format: string | null;
  size: string | null;
  description?: string;
  packaging?: string;
}

export interface ExtractedData {
  client_details: ClientDetails;
  order_information: OrderInformation;
  product_details: ProductDetail[];
}

export interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
}

export interface Order {
  id: string;
  fileName: string;
  uploadDate: Date;
  pdfFilePath?: string;
  pdfFileSize?: number;
  pdfOriginalName?: string;
  data: ExtractedData;
  completionStatus: {
    tableware: number;
    products: number;
    totalTableware: number;
    totalProducts: number;
  };
  comments: Comment[];
  orderColor?: string;
  orderColors?: string[];
}
