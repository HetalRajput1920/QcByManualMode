import React, { useEffect, useRef } from 'react';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaExclamationTriangle, 
  FaTimes, 
  FaClipboardList, 
  FaBoxes, 
  FaCheck,
  FaExclamationCircle
} from 'react-icons/fa';

function CompletionModal({ selectedInvoice, scannedMedicines, onConfirm, onCancel }) {
  const modalRef = useRef(null);
  
  const stats = {
    total: scannedMedicines.length,
    matched: scannedMedicines.filter(m => m.status === 'matched').length,
    mismatched: scannedMedicines.filter(m => m.status === 'mismatched').length,
  };

  const hasMismatches = stats.mismatched > 0;
  const matchPercentage = stats.total > 0 ? (stats.matched / stats.total) * 100 : 0;

  // Handle escape key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  // Handle click outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onCancel();
    }
  };

  const getMatchStatusColor = () => {
    if (matchPercentage === 100) return 'text-green-600';
    if (matchPercentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMatchStatusBg = () => {
    if (matchPercentage === 100) return 'bg-green-50 border-green-200';
    if (matchPercentage >= 80) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const mismatchedItems = scannedMedicines.filter(m => m.status === 'mismatched');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4"
      >
        {/* Header */}
        <div className={`relative rounded-t-2xl p-6 ${hasMismatches ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-600'}`}>
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors duration-200"
          >
            <FaTimes className="text-xl" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-3 rounded-xl backdrop-blur-sm">
              {hasMismatches ? (
                <FaExclamationTriangle className="text-2xl text-white" />
              ) : (
                <FaCheckCircle className="text-2xl text-white" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                Complete Verification
              </h3>
              <p className="text-white text-opacity-90 text-sm mt-1">
                Invoice #{selectedInvoice?.invoiceNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 text-center hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-center mb-2">
                <FaClipboardList className="text-3xl text-gray-500" />
              </div>
              <div className="text-4xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-sm text-gray-500 font-medium mt-1">Total Items</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 text-center hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-center mb-2">
                <FaCheck className="text-3xl text-green-500" />
              </div>
              <div className="text-4xl font-bold text-green-600">{stats.matched}</div>
              <div className="text-sm text-green-600 font-medium mt-1">Matched Items</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 text-center hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-center mb-2">
                <FaExclamationCircle className="text-3xl text-red-500" />
              </div>
              <div className="text-4xl font-bold text-red-600">{stats.mismatched}</div>
              <div className="text-sm text-red-600 font-medium mt-1">Mismatched Items</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Match Rate</span>
              <span className={`text-sm font-bold ${getMatchStatusColor()}`}>
                {Math.round(matchPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full ${
                  matchPercentage === 100 ? 'bg-green-500' :
                  matchPercentage >= 80 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${matchPercentage}%` }}
              />
            </div>
          </div>

          {/* Mismatched Items Preview */}
          {hasMismatches && (
            <div className="mb-6">
              <div className={`rounded-xl border p-5 ${getMatchStatusBg()}`}>
                <div className="flex items-start space-x-3">
                  <FaExclamationTriangle className={`text-xl mt-0.5 ${
                    matchPercentage >= 80 ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                  <div className="flex-1">
                    <p className={`font-medium text-lg ${
                      matchPercentage >= 80 ? 'text-yellow-800' : 'text-red-800'
                    }`}>
                      {stats.mismatched} item(s) require attention
                    </p>
                    <p className={`text-sm mt-1 ${
                      matchPercentage >= 80 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      Please review the following items before proceeding:
                    </p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {mismatchedItems.slice(0, 8).map((item, idx) => (
                        <div key={idx} className="bg-white bg-opacity-50 rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name || 'Unknown Item'}</span>
                            <span className="text-red-600 text-xs font-semibold px-2 py-1 bg-red-100 rounded-full">Mismatch</span>
                          </div>
                          {item.batchNumber && (
                            <div className="text-xs text-gray-500 mt-2">
                              Batch: {item.batchNumber}
                            </div>
                          )}
                          {item.expectedBatch && (
                            <div className="text-xs text-gray-500 mt-1">
                              Expected: {item.expectedBatch}
                            </div>
                          )}
                        </div>
                      ))}
                      {mismatchedItems.length > 8 && (
                        <p className="text-xs text-gray-500 text-center col-span-2 mt-2">
                          And {mismatchedItems.length - 8} more item(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Information Note */}
          <div className={`rounded-xl border p-5 ${
            hasMismatches ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-start space-x-3">
              <FaBoxes className={`text-xl mt-0.5 ${
                hasMismatches ? 'text-blue-500' : 'text-emerald-500'
              }`} />
              <div>
                <p className={`text-base font-medium ${
                  hasMismatches ? 'text-blue-800' : 'text-emerald-800'
                }`}>
                  Verification Summary
                </p>
                <p className={`text-sm mt-1 ${
                  hasMismatches ? 'text-blue-700' : 'text-emerald-700'
                }`}>
                  {hasMismatches 
                    ? 'This verification has mismatches that will be recorded. You can review and address them after completion.'
                    : 'All items have been successfully verified. This invoice will be marked as complete.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-8 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-colors duration-200"
            >
              Continue Scanning
            </button>
            <button
              onClick={onConfirm}
              className={`px-8 py-3 rounded-xl text-white font-medium transition-colors duration-200 shadow-lg ${
                hasMismatches 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
              }`}
            >
              {hasMismatches ? 'Complete with Issues' : 'Complete Verification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompletionModal;