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
  
  // Medicine selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedMedicineIndex, setSelectedMedicineIndex] = useState(-1);
  
  // Batch selection state
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [availableBatches, setAvailableBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(-1);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  
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
  const searchInputRef = useRef(null);
  const batchSearchInputRef = useRef(null);
  const medicineListRef = useRef(null);
  const batchListRef = useRef(null);
  const medicineItemRefs = useRef([]);
  const batchItemRefs = useRef([]);
  const submitButtonRef = useRef(null);

  // Close modal function that updates both states
  const closeModal = useCallback(() => {
    setInternalIsVisible(false);
    setIsvisible(false);
    resetForm();
  }, [setIsvisible]);

  // When internal visibility changes, sync with parent
  useEffect(() => {
    if (!internalIsVisible && isVisible) {
    }
  }, [internalIsVisible, isVisible, setIsvisible]);

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

  // Initialize with medicines from props
  useEffect(() => {
    if (medicines.length > 0) {
      const sortedMedicines = [...medicines].sort((a, b) => {
        const nameA = String(a.name || a.ItName || '').toLowerCase();
        const nameB = String(b.name || b.ItName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setFilteredMedicines(sortedMedicines);
    }
  }, [medicines]);

  // Auto-focus on search input when modal opens
  useEffect(() => {
    if (internalIsVisible && currentStep === 1 && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [internalIsVisible, currentStep]);

  // Auto-focus on batch search when in step 2
  useEffect(() => {
    if (currentStep === 2 && batchSearchInputRef.current) {
      setTimeout(() => {
        batchSearchInputRef.current?.focus();
      }, 100);
    }
  }, [currentStep]);

  // Auto-scroll to selected medicine
  useEffect(() => {
    if (selectedMedicineIndex >= 0 && medicineItemRefs.current[selectedMedicineIndex]) {
      const selectedElement = medicineItemRefs.current[selectedMedicineIndex];
      const container = medicineListRef.current;
      
      if (selectedElement && container) {
        const containerHeight = container.clientHeight;
        const elementTop = selectedElement.offsetTop - container.offsetTop;
        const elementBottom = elementTop + selectedElement.offsetHeight;
        
        if (elementTop < container.scrollTop) {
          container.scrollTo({
            top: elementTop - 20,
            behavior: 'smooth'
          });
        } else if (elementBottom > container.scrollTop + containerHeight) {
          container.scrollTo({
            top: elementBottom - containerHeight + 20,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedMedicineIndex]);

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

  // FIXED: Search function with proper type handling
  const handleFilterMedicines = useCallback((searchValue) => {
    let results;
    
    if (!searchValue.trim()) {
      // When no search, show all sorted medicines
      results = [...medicines].sort((a, b) => {
        const nameA = String(a.name || a.ItName || '').toLowerCase();
        const nameB = String(b.name || b.ItName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      // Filter by name or code (case insensitive)
      const searchLower = searchValue.toLowerCase();
      
      results = medicines.filter(medicine => {
        // Safely convert name to string
        const name = String(medicine.name || medicine.ItName || '').toLowerCase();
        
        // Safely convert code to string - handle numbers, null, undefined
        const code = String(medicine.code || medicine.item_code || medicine.ItemCode || '').toLowerCase();
        
        return name.includes(searchLower) || code.includes(searchLower);
      });
      
      // Sort results alphabetically
      results.sort((a, b) => {
        const nameA = String(a.name || a.ItName || '').toLowerCase();
        const nameB = String(b.name || b.ItName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
    
    setFilteredMedicines(results);
    
    // Auto-select first item if there are results
    if (results.length > 0) {
      setSelectedMedicineIndex(0);
    } else {
      setSelectedMedicineIndex(-1);
    }
  }, [medicines]);

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
  }, [batchSearchTerm, availableBatches]);

  // Get all batches for the selected medicine
  const handleGetAllBatches = async (itemCode) => {
    setIsLoadingBatches(true);
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

  // Select medicine and move to step 2
  const handleSelectMedicine = async (medicine) => {
    setSelectedMedicine(medicine);
    
    setFormData(prev => ({
      ...prev,
      medicineName: String(medicine.name || medicine.ItName || ''),
      mrp: medicine.Mrp || medicine.mrp || '',
      pack: medicine.Pack || medicine.pack || '',
      expiryDate: medicine.Expiry || medicine.expiry || prev.expiryDate
    }));
    
    setSelectedBatch(null);
    setAvailableBatches([]);
    setFilteredBatches([]);
    setBatchSearchTerm('');
    setSelectedBatchIndex(-1);
    
    const itemCode = medicine.item_code || medicine.code || medicine.ItemCode;
    if (!itemCode) {
      setErrors({ batch: 'No item code found in medicine data' });
      return;
    }
    
    setCurrentStep(2);
    await handleGetAllBatches(String(itemCode)); // Convert to string for API call
  };

  // Select batch
  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setFormData(prev => ({
      ...prev,
      batchNumber: batch
    }));
    
    setTimeout(() => {
      submitButtonRef.current?.focus();
    }, 100);
  };

  // Handle search input change
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    handleFilterMedicines(value);
  };

  // Keyboard navigation for medicine list
  const handleMedicineKeyDown = (e) => {
    if (filteredMedicines.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = selectedMedicineIndex < filteredMedicines.length - 1 ? selectedMedicineIndex + 1 : 0;
        setSelectedMedicineIndex(nextIndex);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = selectedMedicineIndex > 0 ? selectedMedicineIndex - 1 : filteredMedicines.length - 1;
        setSelectedMedicineIndex(prevIndex);
        break;
        
      case 'Enter':
      case ' ':
        if (selectedMedicineIndex >= 0) {
          e.preventDefault();
          handleSelectMedicine(filteredMedicines[selectedMedicineIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        closeModal();
        break;
    }
  };

  // Keyboard navigation for batch results
  const handleBatchKeyDown = (e) => {
    if (filteredBatches.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = selectedBatchIndex < filteredBatches.length - 1 ? selectedBatchIndex + 1 : 0;
        setSelectedBatchIndex(nextIndex);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = selectedBatchIndex > 0 ? selectedBatchIndex - 1 : filteredBatches.length - 1;
        setSelectedBatchIndex(prevIndex);
        break;
        
      case 'Enter':
      case ' ':
        if (selectedBatchIndex >= 0) {
          e.preventDefault();
          handleSelectBatch(filteredBatches[selectedBatchIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        handleBackToMedicineSelection();
        break;
    }
  };

  // Go back to step 1
  const handleBackToMedicineSelection = () => {
    setCurrentStep(1);
    setSelectedMedicine(null);
    setAvailableBatches([]);
    setFilteredBatches([]);
    setSelectedBatch(null);
    setErrors({});
    setTimeout(() => searchInputRef.current?.focus(), 100);
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

      const response = await axios.post('http://192.168.1.110:6800/api/ocr/qc_verify', apiData,{
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
    setSearchTerm('');
    setBatchSearchTerm('');
    
    // Reset filtered medicines to original sorted list
    if (medicines.length > 0) {
      const sortedMedicines = [...medicines].sort((a, b) => {
        const nameA = String(a.name || a.ItName || '').toLowerCase();
        const nameB = String(b.name || b.ItName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setFilteredMedicines(sortedMedicines);
    } else {
      setFilteredMedicines([]);
    }
    
    setSelectedMedicine(null);
    setAvailableBatches([]);
    setFilteredBatches([]);
    setSelectedBatch(null);
    setSelectedMedicineIndex(-1);
    setSelectedBatchIndex(-1);
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
      {/* STEP 1: Select Medicine Modal */}
      {currentStep === 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 text-xl">💊</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Select Medicine</h2>
                  <p className="text-sm text-gray-600">
                    Available: {medicines.length} medicines
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close (Esc)"
              >
                <span className="text-gray-600 text-xl">✕</span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Search Input */}
              <div className="p-6 pb-4">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleMedicineKeyDown}
                    placeholder="Search medicine by name or code..."
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-400">🔍</span>
                  </div>
                  {searchTerm && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Medicine List */}
              <div 
                ref={medicineListRef}
                className="flex-1 overflow-y-auto px-6 pb-6"
              >
                {medicines.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl">
                    <div className="text-gray-400 text-5xl mb-4">📦</div>
                    <p className="text-gray-500 text-lg">No medicines available</p>
                    <p className="text-sm text-gray-400 mt-2">Please load an invoice first</p>
                  </div>
                ) : filteredMedicines.length === 0 ? (
                  <div className="p-6 text-center border border-gray-200 rounded-xl">
                    <div className="text-gray-400 text-3xl mb-3">🔍</div>
                    <p className="text-gray-500">No medicines found</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMedicines.map((medicine, index) => {
                      const itemCode = String(medicine.item_code || medicine.code || medicine.ItemCode || '');
                      const medicineName = String(medicine.name || medicine.ItName || '');
                      const mrp = medicine.Mrp || medicine.mrp || '';
                      const pack = medicine.Pack || medicine.pack || '';
                      
                      return (
                        <div
                          key={`${itemCode}_${index}`}
                          ref={el => medicineItemRefs.current[index] = el}
                          onClick={() => handleSelectMedicine(medicine)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedMedicineIndex === index
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                              selectedMedicineIndex === index 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              <span className="text-lg">💊</span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-medium text-gray-800 truncate">{medicineName}</h3>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm text-gray-600">Code: {itemCode}</span>
                                    <span className="text-sm text-gray-600">Pack: {pack}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-blue-600">₹{mrp}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Use ↑ ↓ to navigate</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">Space/Enter to select</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {selectedMedicineIndex >= 0 ? `${selectedMedicineIndex + 1} of ${filteredMedicines.length}` : 'No selection'}
                  </div>
                  <button
                    onClick={closeModal}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Select Batch Modal */}
      {currentStep === 2 && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToMedicineSelection}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to medicine selection"
                >
                  <span className="text-gray-600 text-xl">←</span>
                </button>
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-green-600 text-xl">📦</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Select Batch</h2>
                  <p className="text-sm text-gray-600">
                    {selectedMedicine?.name} • {availableBatches.length} batches available
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
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">Selected Medicine</h3>
                      <div className="text-sm text-gray-600">{selectedMedicine?.name || selectedMedicine?.ItName}</div>
                    </div>
                    <button
                      onClick={handleBackToMedicineSelection}
                      className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-100 rounded border border-gray-300"
                    >
                      Change
                    </button>
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
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="font-medium text-green-600">Ready</div>
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
                          className={`p-3 border rounded-lg cursor-pointer text-center transition-all ${
                            selectedBatch === batchNumber
                              ? 'border-green-500 bg-green-50 shadow-md' 
                              : selectedBatchIndex === index
                              ? 'border-green-300 bg-green-100'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`font-medium truncate ${
                            selectedBatch === batchNumber ? 'text-green-700' : 'text-gray-800'
                          }`}>
                            {batchNumber}
                          </div>
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
                    <span className="text-gray-600">Space/Enter to select</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {selectedBatch ? `Selected: ${selectedBatch}` : 'No batch selected'}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleBackToMedicineSelection}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      Back
                    </button>
                    <button
                      ref={submitButtonRef}
                      onClick={handleSubmit}
                      disabled={isSubmitting || !selectedBatch}
                      className={`px-5 py-2.5 rounded-lg font-medium ${
                        selectedBatch
                          ? 'bg-green-600 text-white hover:bg-green-700'
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