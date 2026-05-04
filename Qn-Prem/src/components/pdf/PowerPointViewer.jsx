import React, { useState, useEffect } from 'react';

const PowerPointViewer = ({ fileUrl, fileName, height }) => {
  const props = { height };
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Add custom CSS for webkit scrollbars
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .thumbnails-container::-webkit-scrollbar {
        width: 6px;
      }
      .thumbnails-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      .thumbnails-container::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      .thumbnails-container::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        setLoading(true);
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch slides');
        }
        
        const data = await response.json();
        
        // Convert base64 image data to data URLs
        if (data.slides && Array.isArray(data.slides)) {
          const slideUrls = data.slides.map(slide => {
            if (slide.image_data) {
              // Create data URL from base64 data
              return `${slide.image_data}`;
            }
            return null;
          }).filter(Boolean);
          
          setSlides(slideUrls);
        } else {
          setSlides([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (fileUrl) {
      fetchSlides();
    }
  }, [fileUrl]);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (slides.length === 0) return;
      
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          setCurrentSlide(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ': // Spacebar
          event.preventDefault();
          setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
          break;
        case 'Home':
          event.preventDefault();
          setCurrentSlide(0);
          break;
        case 'End':
          event.preventDefault();
          setCurrentSlide(slides.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowThumbnails(false);
      }
    };

    // Initial call
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Scroll to the current slide in thumbnails
  useEffect(() => {
    try {
      const activeThumbnail = document.querySelector('.thumbnail-item.active');
      if (activeThumbnail && showThumbnails) {
        const thumbnailContainer = document.querySelector('.thumbnails-container');
        if (thumbnailContainer) {
          const containerRect = thumbnailContainer.getBoundingClientRect();
          const thumbnailRect = activeThumbnail.getBoundingClientRect();
          
          if (thumbnailRect.bottom > containerRect.bottom || thumbnailRect.top < containerRect.top) {
            activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    } catch (err) {
      console.error("Error scrolling to thumbnail:", err);
    }
  }, [currentSlide, showThumbnails]);

  if (loading) {
    return (
      <div className="pptx-viewer">
        <div className="viewer-header">
          <h3>{fileName || 'PowerPoint Presentation'}</h3>
        </div>
        <div className="viewer-content loading">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading slides...</p>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pptx-viewer">
        <div className="viewer-header">
          <h3>{fileName || 'PowerPoint Presentation'}</h3>
        </div>
        <div className="viewer-content error">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#ff4d4f' }}>
            <p>Error loading presentation: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="pptx-viewer">
        <div className="viewer-header">
          <h3>{fileName || 'PowerPoint Presentation'}</h3>
        </div>
        <div className="viewer-content">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No slides found in this presentation.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pptx-viewer" style={{
      display: 'flex',
      flexDirection: 'column',
      height: props.height || '600px', 
      width: '100%',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div className="viewer-header" style={{
        padding: '10px 20px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e8e8e8',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            style={{
              padding: '6px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              backgroundColor: showThumbnails ? '#1890ff' : '#fff',
              color: showThumbnails ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Toggle thumbnails"
          >
            {showThumbnails ? '◀' : '▶'} Slides
          </button>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
            {fileName || 'PowerPoint Presentation'}
          </h3>
        </div>
        <div className="slide-counter" style={{ fontSize: '14px', color: '#666' }}>
          Slide {currentSlide + 1} of {slides.length}
        </div>
      </div>
      
      <div className="viewer-body" style={{
        display: 'flex',
        flex: 1,
        minHeight: 0, /* Important for flex children to shrink */
        overflow: 'hidden'
      }}>
        {/* Thumbnail Panel */}
        {showThumbnails && (
          <div className="thumbnail-panel" style={{
            width: isMobile ? '120px' : '180px',
            minWidth: isMobile ? '120px' : '180px',
            backgroundColor: '#fff',
            borderRight: '1px solid #e8e8e8',
            padding: '8px',
            height: '100%',
            minHeight: 0,
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <h4 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '14px', 
              color: '#333', 
              paddingBottom: '5px',
              borderBottom: '1px solid #e8e8e8',
              flexShrink: 0 // Prevent title from shrinking
            }}>
              Slides ({slides.length})
            </h4>
            <div className="thumbnails-container" style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '4px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#c1c1c1 transparent'
            }}>
              {slides.map((slideUrl, index) => (
                <div
                  key={index}
                  className={`thumbnail-item ${index === currentSlide ? 'active' : ''}`}
                  style={{
                    marginBottom: '8px', // Reduced margin
                    cursor: 'pointer',
                    border: index === currentSlide ? '2px solid #1890ff' : '1px solid #e8e8e8',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: index === currentSlide ? '#f0f8ff' : '#fff',
                    transition: 'all 0.2s',
                    flexShrink: 0 // Prevent thumbnails from shrinking
                  }}
                  onClick={() => setCurrentSlide(index)}
                  onMouseEnter={(e) => {
                    if (index !== currentSlide) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                      e.currentTarget.style.borderColor = '#bfbfbf';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== currentSlide) {
                      e.currentTarget.style.backgroundColor = '#fff';
                      e.currentTarget.style.borderColor = '#e8e8e8';
                    }
                  }}
                >
                  <div style={{
                    padding: '4px 5px', // Reduced padding
                    textAlign: 'center',
                    fontSize: '11px', // Slightly smaller
                    color: index === currentSlide ? '#1890ff' : '#666',
                    fontWeight: index === currentSlide ? 'bold' : 'normal',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{
                    padding: '4px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: isMobile ? '60px' : '80px' // Fixed height
                  }}>
                    <img
                      src={slideUrl}
                      alt={`Slide ${index + 1} thumbnail`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        console.error(`Failed to load thumbnail for slide ${index + 1}`);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Slide View */}
        <div className="main-slide-view" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff'
        }}>
          {/* Navigation Controls */}
          <div className="navigation-controls" style={{
            padding: isMobile ? '8px 10px' : '10px 20px',
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            justifyContent: 'center',
            gap: isMobile ? '8px' : '10px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              style={{
                padding: isMobile ? '6px 12px' : '8px 16px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                backgroundColor: currentSlide === 0 ? '#f5f5f5' : '#fff',
                cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
                color: currentSlide === 0 ? '#bfbfbf' : '#333',
                fontSize: isMobile ? '12px' : '14px'
              }}
            >
              {isMobile ? '←' : '← Previous'}
            </button>
            
            <span style={{ 
              fontSize: isMobile ? '12px' : '14px', 
              color: '#666', 
              minWidth: isMobile ? '80px' : '120px', 
              textAlign: 'center' 
            }}>
              {isMobile ? `${currentSlide + 1}/${slides.length}` : `Slide ${currentSlide + 1} of ${slides.length}`}
            </span>
            
            <button
              onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
              disabled={currentSlide === slides.length - 1}
              style={{
                padding: isMobile ? '6px 12px' : '8px 16px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                backgroundColor: currentSlide === slides.length - 1 ? '#f5f5f5' : '#fff',
                cursor: currentSlide === slides.length - 1 ? 'not-allowed' : 'pointer',
                color: currentSlide === slides.length - 1 ? '#bfbfbf' : '#333',
                fontSize: isMobile ? '12px' : '14px'
              }}
            >
              {isMobile ? '→' : 'Next →'}
            </button>
            
            {/* Add zoom controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                −
              </button>
              <span style={{ fontSize: '12px', color: '#666', minWidth: '50px', textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Fit
              </button>
            </div>
            
            {/* Add fullscreen toggle for mobile */}
            {isMobile && (
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  backgroundColor: showThumbnails ? '#1890ff' : '#fff',
                  color: showThumbnails ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showThumbnails ? 'Hide' : 'Show'} Slides
              </button>
            )}
          </div>

          {/* Current Slide Display */}
          <div className="current-slide-container" style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '10px',
            overflow: 'auto',
            backgroundColor: '#fafafa',
            position: 'relative'
          }}>
            {slides[currentSlide] && (
              <div style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
                padding: '10px'
              }}>
                <img
                  src={slides[currentSlide]}
                  alt={`Slide ${currentSlide + 1}`}
                  style={{
                    display: 'block',
                    width: 'auto',
                    height: 'auto',
                    maxWidth: zoomLevel === 1 ? '100%' : 'none',
                    border: '1px solid #e8e8e8',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    backgroundColor: '#fff'
                  }}
                  onError={(e) => {
                    console.error(`Failed to load slide ${currentSlide + 1} image`);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerPointViewer;