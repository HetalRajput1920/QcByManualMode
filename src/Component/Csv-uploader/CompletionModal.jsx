import React from 'react';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

function CompletionModal({ selectedInvoice, scannedMedicines, onConfirm, onCancel }) {
  const stats = {
    total: scannedMedicines.length,
    matched: scannedMedicines.filter(m => m.status === 'matched').length,
    mismatched: scannedMedicines.filter(m => m.status === 'mismatched').length,
  };

  const hasMismatches = stats.mismatched > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full mx-4">
        <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          {hasMismatches ? (
            <FaExclamationTriangle className="text-yellow-500" />
          ) : (
            <FaCheckCircle className="text-green-500" />
          )}
          <span>Complete Verification</span>
        </h3>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            You're about to complete the verification for <strong>{selectedInvoice?.invoiceNumber}</strong>. 
            Please review the summary:
          </p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Scanned</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
              <div className="text-sm text-green-600">Matched</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.mismatched}</div>
              <div className="text-sm text-red-600">Mismatched</div>
            </div>
          </div>

          {hasMismatches && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 text-yellow-800">
                <FaExclamationTriangle />
                <span className="font-medium">Attention Required</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                {stats.mismatched} item(s) have batch mismatches. Please review these items before completing.
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Once completed, this verification will be recorded and the invoice status will be updated.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            Continue Verification
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white transition-colors duration-200 ${
              hasMismatches 
                ? 'bg-yellow-600 hover:bg-yellow-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {hasMismatches ? 'Complete with Issues' : 'Complete Verification'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompletionModal;