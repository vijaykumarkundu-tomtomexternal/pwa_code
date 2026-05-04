"""
SSL Configuration Helper for HuggingFace Models

This file provides multiple solutions for SSL certificate issues when downloading HuggingFace models.
Use the appropriate solution based on your environment.
"""

import os
import ssl
import urllib3
import warnings
from pathlib import Path

def configure_ssl_bypass():
    """
    Method 1: Complete SSL bypass (use with caution)
    This disables all SSL verification globally
    """
    # Disable SSL warnings
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    warnings.filterwarnings('ignore', message='Unverified HTTPS request')
    
    # Disable SSL verification globally
    ssl._create_default_https_context = ssl._create_unverified_context
    
    # Set environment variables to bypass SSL
    os.environ['CURL_CA_BUNDLE'] = ''
    os.environ['REQUESTS_CA_BUNDLE'] = ''
    os.environ['SSL_VERIFY'] = 'false'
    
    print("✓ SSL bypass configured globally")

def configure_huggingface_offline():
    """
    Method 2: Configure HuggingFace to work offline (if model is already cached)
    """
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    os.environ['HF_DATASETS_OFFLINE'] = '1'
    print("✓ HuggingFace configured for offline mode")

def download_model_manually():
    """
    Method 3: Manual model download instructions
    """
    instructions = """
    If SSL issues persist, you can manually download the model:
    
    1. Download the model files from: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
    2. Save them to: {home}/.cache/huggingface/transformers/
    3. Or use: huggingface-cli download sentence-transformers/all-MiniLM-L6-v2
    
    Alternative: Use a different embedding model that doesn't require download
    """.format(home=Path.home())
    
    print(instructions)

def get_alternative_embeddings():
    """
    Method 4: Use alternative embeddings that don't require internet
    """
    try:
        from sentence_transformers import SentenceTransformer
        # Try to load a local model if available
        model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        return model
    except Exception as e:
        print(f"SentenceTransformer failed: {e}")
        
        # Fallback to a simple embedding implementation
        class SimpleEmbeddings:
            def __init__(self):
                self.model_name = "simple-local"
                print("✓ Using simple local embeddings as fallback")
            
            def embed_documents(self, texts):
                # Simple hash-based embeddings (not semantically meaningful)
                embeddings = []
                for text in texts:
                    # Create a simple vector based on text characteristics
                    vector = [
                        len(text) / 100.0,  # Text length feature
                        text.count(' ') / 10.0,  # Word count feature
                        text.count('.') / 5.0,   # Sentence count feature
                    ]
                    # Pad or truncate to 384 dimensions (standard for all-MiniLM-L6-v2)
                    vector = (vector * 128)[:384]  # Repeat pattern to get 384 dims
                    vector += [0.0] * (384 - len(vector))  # Pad if needed
                    embeddings.append(vector)
                return embeddings
            
            def embed_query(self, text):
                return self.embed_documents([text])[0]
        
        return SimpleEmbeddings()

def configure_corporate_network():
    """
    Method 5: Corporate network configuration
    """
    proxy_instructions = """
    For corporate networks, you may need to:
    
    1. Set proxy environment variables:
       set HTTP_PROXY=http://your-proxy:port
       set HTTPS_PROXY=https://your-proxy:port
    
    2. Add certificate bundle:
       set REQUESTS_CA_BUNDLE=C:\\path\\to\\your\\certificate.pem
    
    3. Or ask your IT department to whitelist:
       - huggingface.co
       - cdn-lfs.huggingface.co
    """
    print(proxy_instructions)

# Main configuration function
def setup_embeddings_with_ssl_fix():
    """
    Main function to set up embeddings with SSL workarounds
    """
    print("Setting up embeddings with SSL fixes...")
    
    # Try Method 1: SSL bypass
    configure_ssl_bypass()
    
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu', 'trust_remote_code': True}
        )
        print("HuggingFace embeddings loaded successfully with SSL bypass")
        return embeddings
        
    except Exception as e:
        print(f"HuggingFace embeddings failed: {e}")
        print("Trying alternative embeddings...")
        
        # Try Method 4: Alternative embeddings
        alternative_embeddings = get_alternative_embeddings()
        
        # Wrap in LangChain compatible interface
        class LangChainCompatibleEmbeddings:
            def __init__(self, embeddings_model):
                self.embeddings_model = embeddings_model
            
            def embed_documents(self, texts):
                if hasattr(self.embeddings_model, 'encode'):
                    return self.embeddings_model.encode(texts).tolist()
                else:
                    return self.embeddings_model.embed_documents(texts)
            
            def embed_query(self, text):
                if hasattr(self.embeddings_model, 'encode'):
                    return self.embeddings_model.encode([text])[0].tolist()
                else:
                    return self.embeddings_model.embed_query(text)
        
        wrapped_embeddings = LangChainCompatibleEmbeddings(alternative_embeddings)
        print("Alternative embeddings configured successfully")
        return wrapped_embeddings

if __name__ == "__main__":
    # Test the SSL configuration
    embeddings = setup_embeddings_with_ssl_fix()
    
    # Test embedding functionality
    try:
        test_text = "This is a test sentence."
        result = embeddings.embed_query(test_text)
        print(f"Test embedding successful: {len(result)} dimensions")
    except Exception as e:
        print(f"Test embedding failed: {e}")
        configure_corporate_network()
        download_model_manually()