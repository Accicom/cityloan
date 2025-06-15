import { supabase } from '../lib/supabase';

export class StorageError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export async function uploadDocument(
  operationNumber: string,
  file: File,
  documentType: 'id_card_front' | 'id_card_back' | 'salary_receipt'
): Promise<string> {
  try {
    console.log(`📤 Uploading ${documentType} for operation ${operationNumber}`);
    console.log(`📄 File details:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    // Create a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${documentType}.${fileExtension}`;
    const filePath = `${operationNumber}/${fileName}`;
    
    console.log(`📁 Upload path: ${filePath}`);
    
    // Method 1: Try with ArrayBuffer for binary data
    try {
      console.log('🔄 Attempting upload with ArrayBuffer...');
      
      const arrayBuffer = await file.arrayBuffer();
      console.log(`📊 ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
      
      const { data, error } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (error) {
        console.warn('⚠️ ArrayBuffer upload failed:', error);
        throw error;
      }

      console.log('✅ ArrayBuffer upload successful:', data.path);
      console.log('📊 Upload response:', data);
      return data.path;
      
    } catch (arrayBufferError) {
      console.warn('⚠️ ArrayBuffer method failed, trying File directly...');
      
      // Method 2: Fallback to direct File upload
      const { data, error } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (error) {
        console.error('❌ Direct file upload also failed:', error);
        throw new StorageError(`Failed to upload ${documentType}: ${error.message}`, error.name);
      }

      console.log('✅ Direct file upload successful:', data.path);
      console.log('📊 Upload response:', data);
      return data.path;
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(`Unexpected error uploading ${documentType}`);
  }
}

export async function getDocumentUrl(filePath: string): Promise<string> {
  try {
    console.log(`🔗 Getting URL for file: ${filePath}`);
    
    const { data } = await supabase.storage
      .from('loan-documents')
      .getPublicUrl(filePath);

    console.log(`✅ Generated URL: ${data.publicUrl}`);
    
    // Test if the URL actually returns the correct content type
    try {
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      console.log(`🔍 File HEAD response:`, {
        status: response.status,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
    } catch (testError) {
      console.warn('⚠️ Could not test file URL:', testError);
    }
    
    return data.publicUrl;
  } catch (error) {
    console.error('❌ Error getting document URL:', error);
    throw new StorageError('Failed to get document URL');
  }
}

export async function deleteDocument(filePath: string): Promise<void> {
  try {
    console.log(`🗑️ Deleting file: ${filePath}`);
    
    const { error } = await supabase.storage
      .from('loan-documents')
      .remove([filePath]);

    if (error) {
      console.error('❌ Storage delete error:', error);
      throw new StorageError(`Failed to delete document: ${error.message}`);
    }

    console.log('✅ Document deleted successfully:', filePath);
  } catch (error) {
    console.error('❌ Delete error:', error);
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError('Unexpected error deleting document');
  }
}

export async function listOperationDocuments(operationNumber: string): Promise<string[]> {
  try {
    console.log(`📋 Listing documents for operation: ${operationNumber}`);
    
    const { data, error } = await supabase.storage
      .from('loan-documents')
      .list(operationNumber);

    if (error) {
      console.error('❌ Storage list error:', error);
      throw new StorageError(`Failed to list documents: ${error.message}`);
    }

    const filePaths = data?.map(file => `${operationNumber}/${file.name}`) || [];
    console.log(`✅ Found ${filePaths.length} documents:`, filePaths);
    return filePaths;
  } catch (error) {
    console.error('❌ List error:', error);
    throw new StorageError('Failed to list operation documents');
  }
}

// Utility function to verify file upload integrity
export async function verifyFileUpload(filePath: string): Promise<{
  exists: boolean;
  contentType?: string;
  size?: number;
}> {
  try {
    console.log(`🔍 Verifying file upload: ${filePath}`);
    
    const url = await getDocumentUrl(filePath);
    const response = await fetch(url, { method: 'HEAD' });
    
    const result = {
      exists: response.ok,
      contentType: response.headers.get('content-type') || undefined,
      size: parseInt(response.headers.get('content-length') || '0') || undefined
    };
    
    console.log(`📊 File verification result:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ File verification error:', error);
    return { exists: false };
  }
}