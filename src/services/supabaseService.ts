// Mock Supabase service - Replace with real Supabase client when ready
export interface InspectionRecord {
  id?: string;
  fileUrl: string;
  text: string;
  audioUrl: string;
  createdAt?: string;
  fileName: string;
  language: 'fi' | 'et' | 'en';
}

export interface SupabaseResponse {
  success: boolean;
  data?: InspectionRecord;
  error?: string;
}

// Mock implementation - replace with actual Supabase when ready
export const supabaseService = {
  async saveInspection(inspection: Omit<InspectionRecord, 'id' | 'createdAt'>): Promise<SupabaseResponse> {
    try {
      // Mock implementation - in real app, use Supabase client
      console.log('Mock: Saving to Supabase inspections table:', inspection);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock successful response
      const savedRecord: InspectionRecord = {
        id: `inspection_${Date.now()}`,
        ...inspection,
        createdAt: new Date().toISOString()
      };
      
      console.log('Mock: Saved inspection:', savedRecord);
      
      return {
        success: true,
        data: savedRecord
      };
    } catch (error) {
      console.error('Mock: Error saving inspection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async uploadFile(file: Blob, fileName: string, bucket: string = 'inspections'): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Mock file upload - in real app, upload to Supabase Storage
      console.log('Mock: Uploading file to Supabase Storage:', { fileName, bucket, size: file.size });
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock file URL
      const mockUrl = `https://mock-supabase.storage.co/object/public/${bucket}/${fileName}?t=${Date.now()}`;
      
      console.log('Mock: File uploaded successfully:', mockUrl);
      
      return {
        success: true,
        url: mockUrl
      };
    } catch (error) {
      console.error('Mock: Error uploading file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async getInspections(limit: number = 50): Promise<{ success: boolean; data?: InspectionRecord[]; error?: string }> {
    try {
      // Mock getting inspections - in real app, query Supabase
      console.log('Mock: Getting inspections from Supabase, limit:', limit);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock data
      const mockInspections: InspectionRecord[] = [
        {
          id: 'inspection_1',
          fileUrl: 'https://mock-supabase.storage.co/object/public/inspections/test1.jpg',
          text: 'Mock inspection analysis result',
          audioUrl: 'https://mock-supabase.storage.co/object/public/inspections/test1_audio.mp3',
          fileName: 'test1.jpg',
          language: 'fi',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        }
      ];
      
      return {
        success: true,
        data: mockInspections
      };
    } catch (error) {
      console.error('Mock: Error getting inspections:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}; 