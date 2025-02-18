import React, { useState, useRef, useEffect } from 'react';
import { Search, ZoomIn, ZoomOut, Highlighter, Pen, Hand, Download, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

const PDFReader = () => {
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [tool, setTool] = useState('cursor');
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pdfText, setPdfText] = useState('');
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [lastPosition, setLastPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  const tools = [
    { id: 'cursor', icon: Hand, label: 'Select' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
    { id: 'pen', icon: Pen, label: 'Draw' }
  ];

  useEffect(() => {
    // Load PDF.js when component mounts
    const pdfjsScript = document.createElement('script');
    pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    document.head.appendChild(pdfjsScript);

    pdfjsScript.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    };

    return () => {
      document.head.removeChild(pdfjsScript);
    };
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setLoading(true);
      try {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
          const typedarray = new Uint8Array(this.result);
          const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
          setPdfFile(pdf);
          setNumPages(pdf.numPages);
          setCurrentPage(1);
          renderPage(1, pdf);
        };
        fileReader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF file');
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please upload a valid PDF file');
    }
  };

  const renderPage = async (pageNum, pdf) => {
    try {
      const canvas = canvasRef.current;
      const page = await pdf.getPage(pageNum);
      
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const context = canvas.getContext('2d');
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Extract text content
      const textContent = await page.getTextContent();
      setPdfText(textContent.items.map(item => item.str).join(' '));
      
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  useEffect(() => {
    if (pdfFile) {
      renderPage(currentPage, pdfFile);
    }
  }, [currentPage, scale, pdfFile]);

  const handleToolChange = (toolId) => {
    setTool(toolId);
  };

  const handleZoom = (direction) => {
    setScale(prev => direction === 'in' ? prev + 0.1 : Math.max(0.5, prev - 0.1));
  };

  const handlePageChange = (direction) => {
    if (!pdfFile) return;
    setCurrentPage(prev => direction === 'next' 
      ? Math.min(prev + 1, numPages)
      : Math.max(prev - 1, 1)
    );
  };

  const startDrawing = (e) => {
    if (tool === 'pen') {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      setLastPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const draw = (e) => {
    if (!isDrawing || tool !== 'pen') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(currentPosition.x, currentPosition.y);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    setLastPosition(currentPosition);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-t-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4 flex-wrap gap-4">
              {/* File Upload */}
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload size={20} />
                <span>Upload PDF</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Tools */}
              <div className="flex space-x-2">
                {tools.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => handleToolChange(id)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      tool === id 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title={label}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>

              {/* Zoom controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleZoom('out')}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  title="Zoom out"
                >
                  <ZoomOut size={20} />
                </button>
                <span className="text-sm text-gray-600">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => handleZoom('in')}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  title="Zoom in"
                >
                  <ZoomIn size={20} />
                </button>
              </div>
            </div>

            {/* Page navigation */}
            {pdfFile && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handlePageChange('prev')}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${
                    currentPage === 1 
                      ? 'text-gray-300' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {numPages}
                </span>
                <button
                  onClick={() => handlePageChange('next')}
                  disabled={currentPage === numPages}
                  className={`p-2 rounded-lg ${
                    currentPage === numPages 
                      ? 'text-gray-300' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-b-xl shadow-lg p-8">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !pdfFile ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <Upload size={48} />
              <p className="mt-4">Upload a PDF to get started</p>
            </div>
          ) : (
            <div 
              className="relative w-full overflow-auto"
              style={{ 
                maxHeight: '80vh',
                transformOrigin: 'top left'
              }}
            >
              <canvas
                ref={canvasRef}
                className="mx-auto shadow-lg"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
              />
              {tool === 'cursor' && (
                <div 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ 
                    userSelect: 'text',
                  }}
                >
                  {pdfText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFReader;