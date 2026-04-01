import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const ManualMedicineAddForm = ({
  medicines = [],
  isVisible,
  setIsvisible
}) => {
  const API_BASE_URL = 'http://192.168.1.110:3000/api/ocr';

  // Modal states
  const [currentStep, setCurrentStep] = useState(1);
  const [internalIsVisible, setInternalIsVisible] = useState(isVisible);

  // Medicine selection state (simplified for single medicine)
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  console.log("this is the selected medicine", selectedMedicine);

  // Batch selection state
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [availableBatches, setAvailableBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(-1);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // Track if batch is selected for double enter handling
  const [isBatchSelected, setIsBatchSelected] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    medicineName: '',
    batchNumber: '',
    expiryDate: '',
    mrp: '',
    pack: ''
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Refs for scrolling and focus management
  const batchSearchInputRef = useRef(null);
  const batchListRef = useRef(null);
  const batchItemRefs = useRef([]);
  const submitButtonRef = useRef(null);
  const modalRef = useRef(null);

  // Close modal function that updates both states
  const closeModal = useCallback(() => {
    setInternalIsVisible(false);
    setIsvisible(false);
    resetForm();
  }, [setIsvisible]);

  // Initialize with parent visibility
  useEffect(() => {
    setInternalIsVisible(isVisible);
  }, [isVisible]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && internalIsVisible) {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [internalIsVisible, closeModal]);

  // Initialize with the first medicine from props (since there's only one)
  useEffect(() => {
    if (medicines.length > 0 && internalIsVisible) {
      const medicine = medicines[0];
      setSelectedMedicine(medicine);

      setFormData({
        medicineName: String(medicine.name || medicine.ItName || ''),
        batchNumber: '',
        expiryDate: medicine.Expiry || medicine.expiry || '',
        mrp: medicine.Mrp || medicine.mrp || '',
        pack: medicine.Pack || medicine.pack || ''
      });

      // Automatically load batches for this medicine
      const itemCode = medicine.item_code || medicine.code || medicine.ItemCode;
      if (itemCode) {
        handleGetAllBatches(String(itemCode));
        setCurrentStep(2); // Directly go to step 2
      } else {
        setErrors({ batch: 'No item code found in medicine data' });
      }
    }
  }, [medicines, internalIsVisible]);

  // Auto-focus on batch search when modal opens - IMPROVED VERSION
  useEffect(() => {
    if (internalIsVisible && currentStep === 2) {
      // Use multiple attempts to ensure focus
      const focusAttempts = [100, 300, 500];

      focusAttempts.forEach(delay => {
        setTimeout(() => {
          if (batchSearchInputRef.current && internalIsVisible) {
            batchSearchInputRef.current.focus();
            console.log(`Focus attempt at ${delay}ms`);
          }
        }, delay);
      });
    }
  }, [internalIsVisible, currentStep]);

  // Also focus when batches finish loading
  useEffect(() => {
    if (!isLoadingBatches && availableBatches.length > 0 && internalIsVisible && currentStep === 2) {
      setTimeout(() => {
        if (batchSearchInputRef.current) {
          batchSearchInputRef.current.focus();
          console.log('Focus after batches loaded');
        }
      }, 150);
    }
  }, [isLoadingBatches, availableBatches, internalIsVisible, currentStep]);

  // Auto-scroll to selected batch
  useEffect(() => {
    if (selectedBatchIndex >= 0 && batchItemRefs.current[selectedBatchIndex]) {
      const selectedElement = batchItemRefs.current[selectedBatchIndex];
      const container = batchListRef.current;

      if (selectedElement && container) {
        const containerHeight = container.clientHeight;
        const elementTop = selectedElement.offsetTop - container.offsetTop;
        const elementBottom = elementTop + selectedElement.offsetHeight;

        if (elementTop < container.scrollTop) {
          container.scrollTo({
            top: elementTop - 10,
            behavior: 'smooth'
          });
        } else if (elementBottom > container.scrollTop + containerHeight) {
          container.scrollTo({
            top: elementBottom - containerHeight + 10,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedBatchIndex]);

  // Filter batches with proper type handling
  useEffect(() => {
    if (batchSearchTerm.trim() === '') {
      setFilteredBatches(availableBatches);
    } else {
      const searchLower = batchSearchTerm.toLowerCase();
      const filtered = availableBatches.filter(batch => {
        const batchNumber = String(batch || '').toLowerCase();
        return batchNumber.includes(searchLower);
      });
      setFilteredBatches(filtered);
    }

    // Auto-select first batch if there are results
    if (filteredBatches.length > 0) {
      setSelectedBatchIndex(0);
    } else {
      setSelectedBatchIndex(-1);
    }

    // Reset batch selected state when search term changes
    setIsBatchSelected(false);
  }, [batchSearchTerm, availableBatches]);

  // Get all batches for the selected medicine
  const handleGetAllBatches = async (itemCode) => {
    setIsLoadingBatches(true);
    setErrors({});
    try {
      const response = await axios.get(`${API_BASE_URL}/get-medicine-batch/${itemCode}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('authToken')}`
        }
      });

      if (response.data) {
        if (response.data.success === false) {
          setErrors({ batch: response.data.message || 'Failed to load batches' });
          return;
        }

        let batches = [];
        if (response.data.batches) {
          batches = response.data.batches;
        } else if (response.data.data) {
          batches = response.data.data;
        } else if (Array.isArray(response.data)) {
          batches = response.data;
        } else if (typeof response.data === 'string') {
          batches = [response.data];
        }

        const processedBatches = batches.map(batch => {
          if (typeof batch === 'string') {
            return batch;
          } else if (batch?.batch) {
            return batch.batch;
          } else if (batch?.Batch) {
            return batch.Batch;
          } else {
            return String(batch);
          }
        }).filter(batch => batch && batch.trim() !== '');

        // Sort batches
        const sortedBatches = processedBatches.sort((a, b) => {
          return String(a).localeCompare(String(b));
        });

        if (sortedBatches.length > 0) {
          setAvailableBatches(sortedBatches);
          setFilteredBatches(sortedBatches);
          setSelectedBatchIndex(0);
        } else {
          setErrors({ batch: 'No batches available for this medicine' });
        }
      } else {
        setErrors({ batch: 'Invalid response from server' });
      }
    } catch (error) {
      console.error('Get all batches error:', error);
      let errorMessage = 'Failed to load batches';
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'No batches found for this medicine';
        } else {
          errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        }
      }
      setErrors({ batch: errorMessage });
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // Select batch
  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setIsBatchSelected(true);
    setFormData(prev => ({
      ...prev,
      batchNumber: batch
    }));

    // Move focus to submit button after selecting batch
    setTimeout(() => {
      submitButtonRef.current?.focus();
    }, 100);
  };

  // Keyboard navigation for batch results
  const handleBatchKeyDown = (e) => {
    // Handle Enter key
    if (e.key === 'Enter') {
      e.preventDefault();

      // If a batch is already selected, submit the form
      if (selectedBatch) {
        handleSubmit();
      }
      // If no batch is selected but there's a highlighted one, select it
      else if (selectedBatchIndex >= 0 && filteredBatches[selectedBatchIndex]) {
        handleSelectBatch(filteredBatches[selectedBatchIndex]);
      }
      return;
    }

    // Handle Space key (for selection only, not submission)
    if (e.key === ' ') {
      e.preventDefault();
      if (selectedBatchIndex >= 0 && filteredBatches[selectedBatchIndex]) {
        handleSelectBatch(filteredBatches[selectedBatchIndex]);
      }
      return;
    }

    if (filteredBatches.length === 0) return;

    // Handle arrow keys for navigation
    const handledKeys = ['ArrowDown', 'ArrowUp', 'Escape'];
    if (handledKeys.includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowDown':
        const nextIndex = selectedBatchIndex < filteredBatches.length - 1 ? selectedBatchIndex + 1 : 0;
        setSelectedBatchIndex(nextIndex);
        break;

      case 'ArrowUp':
        const prevIndex = selectedBatchIndex > 0 ? selectedBatchIndex - 1 : filteredBatches.length - 1;
        setSelectedBatchIndex(prevIndex);
        break;

      case 'Escape':
        closeModal();
        break;

      default:
        break;
    }
  };

  // Handle submit button keyboard events
  const handleSubmitButtonKeyDown = (e) => {
    if (e.key === 'Enter' && selectedBatch) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!selectedBatch) return;

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const apiData = {
        name: formData.medicineName,
        batch: formData.batchNumber,
        expiry: formData.expiryDate,
        mrp: formData.mrp,
        pack: formData.pack,
      };

      const response = await axios.post('http://192.168.1.110:6800/api/ocr/qc_verify', apiData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('authToken')}`
        }
      });

      if (response.data?.success) {
        // Show success message
        setSuccessMessage(`${formData.medicineName} added successfully!`);

        // Close modal after a short delay
        setTimeout(() => {
          closeModal();
        }, 800);

      } else {
        closeModal();
      }
    } catch (error) {
      console.error('Submit error:', error);
      let errorMessage = 'Failed to add medicine';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form (internal only)
  const resetForm = () => {
    setBatchSearchTerm('');
    setSelectedMedicine(null);
    setAvailableBatches([]);
    setFilteredBatches([]);
    setSelectedBatch(null);
    setSelectedBatchIndex(-1);
    setIsBatchSelected(false);
    setCurrentStep(1);
    setFormData({
      medicineName: '',
      batchNumber: '',
      expiryDate: '',
      mrp: '',
      pack: ''
    });
    setErrors({});
    setSuccessMessage('');
  };

  if (!internalIsVisible) return null;

  return (
    <>
      {/* STEP 2: Select Batch Modal (Directly shown) */}
      {currentStep === 2 && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-200"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-green-600 text-xl">📦</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Select Batch</h2>
                  <p className="text-sm text-gray-600">
                    {selectedMedicine?.name || selectedMedicine?.ItName} • {availableBatches.length} batches available
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Close (Esc)"
              >
                <span className="text-gray-600 text-xl">✕</span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Selected Medicine Info */}
              <div className="p-6 pb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <h3 className="font-medium text-gray-800">Selected Medicine</h3>
                    <div className="text-sm text-gray-600">{selectedMedicine?.name || selectedMedicine?.ItName}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">Code</div>
                      <div className="font-medium">{String(selectedMedicine?.item_code || selectedMedicine?.code || '')}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">MRP</div>
                      <div className="font-medium text-green-600">₹{selectedMedicine?.Mrp || selectedMedicine?.mrp}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">Pack</div>
                      <div className="font-medium">{selectedMedicine?.Pack || selectedMedicine?.pack}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">Expiry</div>
                      <div className="font-medium">{selectedMedicine?.Expiry || selectedMedicine?.expiry || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Search */}
              <div className="px-6 pb-4">
                <div className="relative">
                  <input
                    ref={batchSearchInputRef}
                    type="text"
                    value={batchSearchTerm}
                    onChange={(e) => setBatchSearchTerm(e.target.value)}
                    onKeyDown={handleBatchKeyDown}
                    placeholder="Search batches..."
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    disabled={isLoadingBatches}
                    autoFocus
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-400">🔍</span>
                  </div>
                  {batchSearchTerm && (
                    <button
                      onClick={() => setBatchSearchTerm('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                  {isLoadingBatches && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Batch List */}
              <div
                ref={batchListRef}
                className="flex-1 overflow-y-auto px-6 pb-6"
              >
                {isLoadingBatches ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3"></div>
                    <p className="text-gray-600">Loading batches...</p>
                  </div>
                ) : errors.batch && !isLoadingBatches ? (
                  <div className="p-6 text-center border border-red-200 rounded-xl bg-red-50">
                    <div className="text-red-400 text-3xl mb-3">⚠️</div>
                    <p className="text-red-600 font-medium">{errors.batch}</p>
                    <button
                      onClick={() => {
                        const itemCode = selectedMedicine?.item_code || selectedMedicine?.code || selectedMedicine?.ItemCode;
                        if (itemCode) {
                          handleGetAllBatches(String(itemCode));
                        }
                      }}
                      className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredBatches.length === 0 ? (
                  <div className="p-6 text-center border border-gray-200 rounded-xl">
                    <div className="text-gray-400 text-3xl mb-3">📦</div>
                    <p className="text-gray-500">No batches available</p>
                    <p className="text-sm text-gray-400 mt-1">Please check the medicine details</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {filteredBatches.map((batch, index) => {
                      const batchNumber = String(batch || '');
                      return (
                        <div
                          key={`${batchNumber}_${index}`}
                          ref={el => batchItemRefs.current[index] = el}
                          onClick={() => handleSelectBatch(batchNumber)}
                          className={`p-3 border rounded-lg cursor-pointer text-center transition-all ${selectedBatch === batchNumber
                              ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200'
                              : selectedBatchIndex === index
                                ? 'border-green-300 bg-green-100'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <div className={`font-medium truncate ${selectedBatch === batchNumber ? 'text-green-700' : 'text-gray-800'
                            }`}>
                            {batchNumber}
                          </div>
                          {selectedBatch === batchNumber && (
                            <div className="text-xs text-green-600 mt-1">
                              Press Enter to add
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Success Message */}
              {successMessage && (
                <div className="mx-6 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <p className="text-green-800">{successMessage}</p>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Closing automatically...</p>
                </div>
              )}

              {/* Error Message */}
              {errors.submit && (
                <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">⚠️</span>
                    <p className="text-red-800">{errors.submit}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Use ↑ ↓ to navigate</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 font-medium text-green-600">
                      {selectedBatch
                        ? 'Press Enter to add medicine'
                        : 'Press Enter to select batch'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {selectedBatch ? `Selected: ${selectedBatch}` : 'No batch selected'}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      ref={submitButtonRef}
                      onClick={handleSubmit}
                      onKeyDown={handleSubmitButtonKeyDown}
                      disabled={isSubmitting || !selectedBatch}
                      className={`px-5 py-2.5 rounded-lg font-medium ${selectedBatch
                          ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Medicine'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManualMedicineAddForm;