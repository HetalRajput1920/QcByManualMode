import React, { useState, useEffect, useRef } from 'react';
import ManualMedicineAddForm from './addbatch';

function BatchDetailsModal({ 
  isVisible, 
  onClose, 
  itemCode, 
  itemName, 
  batches,
  onUpdateQuantity,
  onAddBatch
}) {
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [batchMedicineData, setBatchMedicineData] = useState(null);
  const modalRef = useRef(null);
  const tableRef = useRef(null);
  
  // Store the original unsorted batches to maintain order
  const [originalBatches, setOriginalBatches] = useState([]);
  
  console.log("this is batch data", batchMedicineData);
  
  // Update original batches when props change, but preserve order
  useEffect(() => {
    if (batches.length > 0) {
      // If we have original batches, try to preserve the order
      if (originalBatches.length > 0) {
        // Create a map of existing batches by their composite key
        const batchMap = new Map();
        originalBatches.forEach((batch, idx) => {
          const key = `${batch.batch}_${batch.psrlno}`;
          batchMap.set(key, { batch, index: idx });
        });
        
        // Reorder new batches to match original order as much as possible
        const reorderedBatches = [];
        const remainingBatches = [...batches];
        
        // First, add batches in the original order if they still exist
        originalBatches.forEach(origBatch => {
          const key = `${origBatch.batch}_${origBatch.psrlno}`;
          const existingIndex = remainingBatches.findIndex(b => 
            `${b.batch}_${b.psrlno}` === key
          );
          if (existingIndex !== -1) {
            reorderedBatches.push(remainingBatches[existingIndex]);
            remainingBatches.splice(existingIndex, 1);
          }
        });
        
        // Then add any new batches at the end
        reorderedBatches.push(...remainingBatches);
        
        // Only update if the order is different
        if (JSON.stringify(reorderedBatches) !== JSON.stringify(originalBatches)) {
          setOriginalBatches(reorderedBatches);
        }
      } else {
        // First time, just store the batches as they come
        setOriginalBatches(batches);
      }
    } else {
      setOriginalBatches([]);
    }
  }, [batches]);
  
  // Calculate total quantities - EXCLUDE mismatched batches from expected total
  const totalScannedQty = originalBatches.reduce((sum, batch) => sum + (batch.scannedQty || 0), 0);
  
  // Only include non-mismatched batches in expected quantity calculation
  const validBatches = originalBatches.filter(batch => 
    !batch.isMismatchBatch && !batch.isMismatchExpiry && !batch.isMismatchMrp
  );
  
  const totalExpectedQty = validBatches.reduce((sum, batch) => sum + (batch.expectedQty || 0), 0);
  
  // Calculate completion percentage based on valid batches only
  const completionPercentage = totalExpectedQty > 0 
    ? Math.round((totalScannedQty / totalExpectedQty) * 100) 
    : 0;
  
  // Check if progress is 100% or more (based on valid expected quantity)
  const isProgressComplete = totalScannedQty >= totalExpectedQty;
  
  // Determine status color based on completion
  const getCompletionStatusColor = () => {
    if (totalScannedQty >= totalExpectedQty) return 'text-green-600';
    if (totalScannedQty > 0) return 'text-blue-600';
    return 'text-gray-600';
  };
    
  // Store the current batch key to maintain selection across updates
  const [currentBatchKey, setCurrentBatchKey] = useState(null);

  // Reset selected index when batches change, but only if it's a different medicine
  useEffect(() => {
    // Don't reset if we have a current batch key and it still exists in the new batches
    if (currentBatchKey && originalBatches.length > 0) {
      // Try to find the same batch by its unique identifier (batch + psrlno)
      const sameBatchIndex = originalBatches.findIndex(b => 
        `${b.batch}_${b.psrlno}` === currentBatchKey
      );
      
      if (sameBatchIndex !== -1) {
        // If found, select that same batch
        setSelectedBatchIndex(sameBatchIndex);
        return;
      }
    }
    
    // Otherwise reset to first batch
    setSelectedBatchIndex(0);
    if (originalBatches.length > 0) {
      setCurrentBatchKey(`${originalBatches[0].batch}_${originalBatches[0].psrlno}`);
    } else {
      setCurrentBatchKey(null);
    }
  }, [originalBatches]);

  // Update current batch key when selected batch changes
  useEffect(() => {
    if (originalBatches[selectedBatchIndex]) {
      setCurrentBatchKey(`${originalBatches[selectedBatchIndex].batch}_${originalBatches[selectedBatchIndex].psrlno}`);
    }
  }, [selectedBatchIndex, originalBatches]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      // Don't handle if in input field or add batch modal is open
      if (showAddBatchModal || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedBatchIndex(prev => 
            prev < originalBatches.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedBatchIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case '+':
        case '=':
          e.preventDefault();
          // Only allow increase if progress is not complete
          if (!isProgressComplete && originalBatches[selectedBatchIndex] && onUpdateQuantity) {
            onUpdateQuantity(
              itemCode,
              originalBatches[selectedBatchIndex].batch,
              originalBatches[selectedBatchIndex].psrlno,
              'increase'
            );
          }
          break;
        case '-':
        case '_':
          e.preventDefault();
          if (originalBatches[selectedBatchIndex] && onUpdateQuantity) {
            onUpdateQuantity(
              itemCode,
              originalBatches[selectedBatchIndex].batch,
              originalBatches[selectedBatchIndex].psrlno,
              'decrease'
            );
          }
          break;
        case 'Enter':
          e.preventDefault();
          // Open add batch modal when Enter is pressed
          handleAddBatchClick();
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, originalBatches, selectedBatchIndex, itemCode, onUpdateQuantity, onClose, showAddBatchModal, isProgressComplete]);

  // Auto-scroll to selected batch
  useEffect(() => {
    if (tableRef.current && originalBatches[selectedBatchIndex]) {
      const selectedRow = tableRef.current.querySelector(`[data-index="${selectedBatchIndex}"]`);
      if (selectedRow) {
        selectedRow.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedBatchIndex, originalBatches]);

  // Helper function to check if batch is mismatched
  const isBatchMismatched = (batch) => {
    return batch.isMismatchBatch || batch.isMismatchExpiry || batch.isMismatchMrp;
  };

  // Handle add batch button click
  const handleAddBatchClick = () => {
    // Don't allow adding new batch if progress is complete
    if (isProgressComplete) {
      alert('Cannot add new batch. Total expected quantity has been reached.');
      return;
    }

    // Prepare medicine data for the add batch form
    const medicineData = {
      code: itemCode,
      name: itemName,
      mrp: originalBatches[selectedBatchIndex] ? originalBatches[selectedBatchIndex].mrp : null,
      expiry: originalBatches[selectedBatchIndex] ? originalBatches[selectedBatchIndex].expiry : null,
      Pack: originalBatches[selectedBatchIndex] ? originalBatches[selectedBatchIndex].pack : null,
      item_code: itemCode,
      ItName: itemName
    };
    
    // Open the modal directly from here with higher z-index
    setBatchMedicineData(medicineData);
    setShowAddBatchModal(true);
  };

  if (!isVisible) return null;

  const getStatusColor = (batch) => {
    if (isBatchMismatched(batch)) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (batch) => {
    const mismatches = [];
    if (batch.isMismatchBatch) mismatches.push('Batch');
    if (batch.isMismatchExpiry) mismatches.push('Expiry');
    if (batch.isMismatchMrp) mismatches.push('MRP');
    
    if (mismatches.length > 0) {
      return `${mismatches.join('/')} Mismatch`;
    }
    return 'Matched';
  };

  const getQuantityColor = (scanned) => {
    // Just color based on whether there's any scanned quantity
    if (scanned > 0) return 'text-green-600 font-bold';
    return 'text-gray-900';
  };

  const getRowBackgroundColor = (index) => {
    return index === selectedBatchIndex 
      ? 'bg-blue-100 border-l-4 border-l-blue-600' 
      : 'hover:bg-gray-50';
  };

  const handleQuantityChange = (batch, operation) => {
    if (onUpdateQuantity) {
      // For increase operation, check if progress is complete
      if (operation === 'increase' && isProgressComplete) {
        alert('Cannot increase quantity. Total expected quantity has been reached.');
        return;
      }
      
      console.log('Quantity change triggered:', { batch, operation });
      onUpdateQuantity(itemCode, batch.batch, batch.psrlno, operation);
    }
  };

  // Count mismatched batches
  const mismatchedCount = originalBatches.filter(isBatchMismatched).length;

  return (
    <>
      {/* Add Batch Modal */}
      {showAddBatchModal && batchMedicineData && (
        <div style={{ position: 'relative', zIndex: 9999 }}>
          <ManualMedicineAddForm
            medicines={[batchMedicineData]}
            isVisible={showAddBatchModal}
            setIsvisible={setShowAddBatchModal}
          />
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
        <div 
          ref={modalRef}
          className="bg-white rounded-3xl shadow-2xl max-w-[99vw] w-full max-h-[99vh] flex flex-col"
          style={{ width: '1800px' }}
        >
          {/* Simplified Header - Only Medicine Name and Code */}
          <div className="px-10 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-bold text-blue-700">
                  Batch Details
                </h3>
                <p className="text-2xl font-bold text-gray-800 mt-2">
                  {itemName} <span className="text-gray-400 mx-4 text-xl">|</span> <span className="text-xl font-normal">Code:</span> {itemCode}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-4xl font-bold w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-200"
                title="Close (Esc)"
              >
                ×
              </button>
            </div>
            
            {/* Quantity Display - Centered */}
            <div className="flex justify-center mt-4">
              <div className="inline-flex items-center space-x-4 bg-white rounded-xl shadow-md px-6 py-3">
                <div className="px-6 py-2 bg-blue-100 rounded-lg">
                  <span className="text-sm text-blue-700 font-medium">Scanned Quantity</span>
                  <span className={`ml-3 text-2xl font-bold ${getCompletionStatusColor()}`}>
                    {totalScannedQty}
                  </span>
                </div>
                <div className="text-2xl text-gray-400">|</div>
                <div className="px-6 py-2 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-700 font-medium">Expected Quantity</span>
                  <span className="ml-3 text-2xl font-bold text-gray-800">
                    {totalExpectedQty}
                  </span>
                </div>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex justify-center mt-3 space-x-3">
              {isProgressComplete && (
                <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  ✓ Complete
                </span>
              )}
              {mismatchedCount > 0 && (
                <span className="px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  ⚠️ {mismatchedCount} mismatched {mismatchedCount === 1 ? 'batch' : 'batches'}
                </span>
              )}
            </div>

            {/* Keyboard shortcuts hint */}
            <p className="text-sm text-gray-500 mt-4 text-center">
              Press <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> to add new batch
            </p>
          </div>
          
          {/* Table Container */}
          <div className="overflow-auto flex-1 p-8">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-xl" ref={tableRef}>
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-8 py-5 text-left text-base font-bold text-gray-700 uppercase tracking-wider w-20">#</th>
                  <th className="px-8 py-5 text-left text-base font-bold text-gray-700 uppercase tracking-wider">PSRL No</th>
                  <th className="px-8 py-5 text-left text-base font-bold text-gray-700 uppercase tracking-wider">Batch</th>
                  <th className="px-8 py-5 text-left text-base font-bold text-gray-700 uppercase tracking-wider">Expiry</th>
                  <th className="px-8 py-5 text-left text-base font-bold text-gray-700 uppercase tracking-wider">MRP</th>
                  <th className="px-8 py-5 text-left text-base font-bold text-gray-700 uppercase tracking-wider">Quantity</th>
                  <th className="px-8 py-5 text-left text-base font-bold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {originalBatches.length > 0 ? (
                  originalBatches.map((batch, index) => (
                    <tr 
                      key={`${batch.batch}_${batch.psrlno}_${index}`}
                      data-index={index}
                      className={`transition-all duration-150 ${getRowBackgroundColor(index)}`}
                    >
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="text-base font-medium text-gray-500">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="text-base font-semibold text-gray-900">
                          {batch.psrlno || batch.Psrlno || 'N/A'}
                        </span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className={`text-base font-medium ${batch.isMismatchBatch ? 'text-red-600' : 'text-gray-900'}`}>
                          {batch.batch || 'N/A'}
                          {batch.isMismatchBatch && (
                            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              Mismatch
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className={`text-base ${batch.isMismatchExpiry ? 'text-red-600' : 'text-gray-900'}`}>
                          {batch.expiry || 'N/A'}
                          {batch.isMismatchExpiry && (
                            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              Mismatch
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className={`text-base ${batch.isMismatchMrp ? 'text-red-600' : 'text-gray-900'}`}>
                          ₹{typeof batch.mrp === 'number' ? batch.mrp.toFixed(2) : batch.mrp || 0}
                          {batch.isMismatchMrp && (
                            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              Mismatch
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleQuantityChange(batch, 'decrease')}
                            disabled={batch.scannedQty <= 0}
                            className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-xl hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 font-bold text-xl"
                            title="Decrease quantity (-)"
                          >
                            -
                          </button>
                          <div className="min-w-[80px] text-center">
                            <span className={`text-lg font-bold ${getQuantityColor(batch.scannedQty)}`}>
                              {batch.scannedQty || 0}
                            </span>
                          </div>
                          <button
                            onClick={() => handleQuantityChange(batch, 'increase')}
                            disabled={isProgressComplete}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-200 font-bold text-xl ${
                              isProgressComplete 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                            }`}
                            title={isProgressComplete ? "Cannot increase - total expected quantity reached" : "Increase quantity (+)"}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className={`px-4 py-2 text-sm font-medium rounded-full ${getStatusColor(batch)}`}>
                          {getStatusText(batch)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-8 py-20 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <span className="text-6xl mb-6">📦</span>
                        <p className="text-2xl font-medium">No batch details available</p>
                        <p className="text-lg text-gray-400 mt-3">There are no batches to display for this item</p>
                        <button
                          onClick={handleAddBatchClick}
                          disabled={isProgressComplete}
                          className={`mt-4 px-6 py-3 rounded-xl font-medium flex items-center space-x-2 ${
                            isProgressComplete
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={isProgressComplete ? "Cannot add - total expected quantity reached" : "Add New Batch"}
                        >
                          <span className="text-xl">+</span>
                          <span>Add New Batch</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer */}
          <div className="flex justify-between items-center px-10 py-8 border-t border-gray-200 bg-gray-50 rounded-b-3xl">
            <div className="flex items-center space-x-8">
              <div className="text-lg text-gray-700">
                <span className="font-semibold">Total Batches:</span> 
                <span className="font-bold text-blue-600 ml-3 text-xl">{originalBatches.length}</span>
                {mismatchedCount > 0 && (
                  <span className="ml-3 text-sm text-purple-600">
                    ({mismatchedCount} mismatched)
                  </span>
                )}
              </div>
              
              {/* Summary in footer */}
              <div className="flex items-center space-x-4">
                <div className="px-4 py-2 bg-white rounded-lg shadow-sm">
                  <span className="text-sm text-gray-600">Valid Expected:</span>
                  <span className="ml-2 text-lg font-bold text-gray-800">{totalExpectedQty}</span>
                </div>
                <div className="px-4 py-2 bg-white rounded-lg shadow-sm">
                  <span className="text-sm text-gray-600">Total Scanned:</span>
                  <span className={`ml-2 text-lg font-bold ${getCompletionStatusColor()}`}>
                    {totalScannedQty}
                  </span>
                </div>
                <div className={`px-4 py-2 rounded-lg ${
                  isProgressComplete 
                    ? 'bg-green-100' 
                    : totalScannedQty > 0 
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}>
                  <span className="font-medium">
                    {totalScannedQty}/{totalExpectedQty} ({completionPercentage}%)
                  </span>
                </div>
              </div>
              
              {originalBatches[selectedBatchIndex] && (
                <div className="text-base text-gray-600 bg-white px-6 py-3 rounded-xl shadow-md">
                  <span className="font-medium">Selected:</span> Batch {originalBatches[selectedBatchIndex].batch} 
                  <span className="text-gray-400 mx-3">|</span>
                  PSRL: {originalBatches[selectedBatchIndex].psrlno || 'N/A'}
                  <span className="text-gray-400 mx-3">|</span>
                  Qty: {originalBatches[selectedBatchIndex].scannedQty || 0}
                  {isBatchMismatched(originalBatches[selectedBatchIndex]) && (
                    <span className="ml-3 text-purple-600 text-xs font-semibold">(Mismatch)</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-5">
              <button
                onClick={handleAddBatchClick}
                disabled={isProgressComplete}
                className={`px-8 py-3.5 rounded-xl transition-colors duration-200 font-medium shadow-md hover:shadow-lg flex items-center space-x-3 text-lg ${
                  isProgressComplete
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title={isProgressComplete ? "Cannot add - total expected quantity reached" : "Add New Batch (Enter)"}
              >
                <span className="text-xl">+</span>
                <span>Add New Batch (Enter)</span>
              </button>
              <button
                onClick={onClose}
                className="px-8 py-3.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors duration-200 font-medium shadow-md hover:shadow-lg text-lg"
              >
                Close (Esc)
              </button>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="px-10 py-4 bg-blue-50 border-t border-blue-100 text-base text-blue-700 flex items-center space-x-8 rounded-b-3xl flex-wrap">
            <span className="flex items-center"><span className="font-mono bg-white px-3 py-1.5 rounded mr-3 text-sm">↑</span> Previous batch</span>
            <span className="flex items-center"><span className="font-mono bg-white px-3 py-1.5 rounded mr-3 text-sm">↓</span> Next batch</span>
            <span className="flex items-center"><span className="font-mono bg-white px-3 py-1.5 rounded mr-3 text-sm">+</span> Increase quantity</span>
            <span className="flex items-center"><span className="font-mono bg-white px-3 py-1.5 rounded mr-3 text-sm">-</span> Decrease quantity</span>
            <span className="flex items-center"><span className="font-mono bg-white px-3 py-1.5 rounded mr-3 text-sm">Enter</span> Add batch</span>
            <span className="flex items-center"><span className="font-mono bg-white px-3 py-1.5 rounded mr-3 text-sm">Esc</span> Close</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default BatchDetailsModal;