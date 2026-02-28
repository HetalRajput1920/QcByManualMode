import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FaSignOutAlt,
  FaChevronDown,
  FaSearch,
  FaSync,
  FaExclamationTriangle,
  FaUser,
  FaShoppingBasket,
  FaTimes,
  FaChartLine,
  FaBars,
  FaTimes as FaTimesCircle,
  FaTrashAlt,
  FaSave
} from 'react-icons/fa';
import axios from 'axios';

function Header({
  selectedInvoice,
  onInvoiceSelect,
  setInvItems,
  showLogoutConfirm,
  setShowLogoutConfirm,
  onCompleteScanning,
  scannedMedicines,
  socketConnection,
  lastError,
  workflowStatus,
  uniqueItemsCount,
  groupedMedicines,
  saveToLocalStorage,
  clearLocalStorage
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedBasketIndex, setFocusedBasketIndex] = useState(-1);
  const [baskets, setBaskets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [checkerSummary, setCheckerSummary] = useState({
    completedBills: 0,
    itemCount: 0,
    itemQuantity: 0,
    target: 0
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const basketButtonRef = useRef(null);
  const isInputFocusedRef = useRef(false);
  const keyboardNavigationEnabled = useRef(true);
  const shouldFocusBasketRef = useRef(false);
  const headerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName') || 'User';

  // Memoized filtered baskets
  const filteredBaskets = useMemo(() => {
    if (!searchTerm.trim()) {
      return baskets;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return baskets.filter(basket => {
      const basketNumber = basket.basketNumber?.toLowerCase() || '';
      const customerName = basket.customerName?.toLowerCase() || '';
      const route = basket.route?.toLowerCase() || '';
      const invoiceNo = basket.invoiceNo?.toString() || '';
      
      return (
        basketNumber.includes(searchLower) ||
        customerName.includes(searchLower) ||
        route.includes(searchLower) ||
        invoiceNo.includes(searchLower)
      );
    });
  }, [baskets, searchTerm]);

  // Fetch checker summary function
  const fetchCheckerSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const response = await fetch('http://192.168.1.110:3500/api/warehouse/get-checker-summary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const summaryData = await response.json();
        setCheckerSummary({
          completedBills: summaryData.BillNo || 0,
          itemCount: summaryData.ItemCnt || 0,
          itemQuantity: summaryData.ItemQty || 0,
          target: summaryData.Target || 0
        });
        return summaryData;
      } else {
        console.error('❌ Checker summary API error:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting checker summary:', error);
      return null;
    } finally {
      setSummaryLoading(false);
    }
  }, [token]);

  // Fetch checker summary on component mount
  useEffect(() => {
    fetchCheckerSummary();
  }, [fetchCheckerSummary]);

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsProgressCollapsed(true);
      } else {
        setIsProgressCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track input focus state
  useEffect(() => {
    const handleFocusIn = (event) => {
      const target = event.target;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');
      
      isInputFocusedRef.current = isInput;
      
      if (isInput) {
        keyboardNavigationEnabled.current = false;
        setTimeout(() => {
          keyboardNavigationEnabled.current = true;
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  // OCR QC Process API function
  const sendToOCRQCProcess = async (itemsData) => {
    if (!itemsData || !Array.isArray(itemsData) || itemsData.length === 0) {
      console.log('❌ No items data to send to OCR QC process');
      return null;
    }

    try {
      setOcrLoading(true);
      const transformedItems = itemsData.map(item => ({
        name: item['Item Name'] || item.ItName || item.name || '',
        Mrp: item.MRP || item.mrp || 0,
        Batch: item.Batch || item.batch || '',
        Pack: item.Pack || item.pack || '',
        Expiry: item.Expiry || item.expiry || '',
        qty: item.Qty || item.quantity || 0,
        itemc: item.Itemc?.toString() || item.code || '',
        vno: item.Vno || '',
        psrlno : item.Psrlno || ''
      }));

      const response = await fetch('http://192.168.1.110:6800/api/ocr/qc_process_json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transformedItems)
      });

      if (!response.ok) {
        throw new Error(`OCR QC API responded with status: ${response.status}`);
      }

      const ocrResponse = await response.json();
      return ocrResponse;
    } catch (error) {
      console.error('❌ Error sending data to OCR QC Process API:', error);
      return null;
    } finally {
      setOcrLoading(false);
    }
  };

  // Search baskets API call
  const searchBaskets = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      
      const response = await fetch(`http://192.168.1.110:3500/api/warehouse/search-basket-for-checking-v2?name=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      let basketsArray = [];

      if (Array.isArray(responseData)) {
        basketsArray = responseData;
      } else if (responseData && typeof responseData === 'object') {
        if (responseData.Basket) {
          basketsArray = [responseData];
        } else if (responseData.data && Array.isArray(responseData.data)) {
          basketsArray = responseData.data;
        } else if (responseData.basketNumber || responseData.name) {
          basketsArray = [responseData];
        }
      }

      if (basketsArray.length > 0) {
        const transformedBaskets = basketsArray.map(basketData => {
          const basketNumber = basketData.Basket || basketData.basketNumber || basketData.name || `BASKET-${Date.now()}`;
          
          return {
            id: basketData.InvoiceNo || basketNumber,
            basketNumber: basketNumber,
            invoiceNo: basketData.InvoiceNo,
            customerName: basketData.CustName,
            route: basketData.Route,
            status: basketData.Status,
            originalData: basketData
          };
        });

        if (!searchQuery.trim()) {
          transformedBaskets.sort((a, b) => {
            const numA = parseInt(a.basketNumber.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.basketNumber.replace(/\D/g, '')) || 0;
            return numA - numB;
          });
        }

        setBaskets(transformedBaskets);
        setConnectionStatus('connected');
        
        if (transformedBaskets.length > 0) {
          setFocusedBasketIndex(0);
        } else {
          setFocusedBasketIndex(-1);
        }
      } else {
        setBaskets([]);
        setFocusedBasketIndex(-1);
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('❌ Error searching baskets:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Handle basket selection
  const handleBasketSelect = async (basket) => {
    try {
      setLoading(true);
      
      const response = await axios.post(
        'http://192.168.1.110:3500/api/warehouse/get-invoice-items-checker2',
        { BasketNo: basket.basketNumber },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const basketDetails = response.data;
      
      const completeInvoice = {
        InvoiceNo: basketDetails.InvoiceNo || basket.basketNumber,
        Basket: basketDetails.Basket || basket.basketNumber,
        CustName: basketDetails.CustName || 'Unknown Customer',
        Address: basketDetails.Address || 'No address provided',
        Acno: basketDetails.Acno || 0,
        Amt: basketDetails.Amt || 0,
        Route: basketDetails.Route || 'Unknown Route',
        Status: basketDetails.Status || 'OnChecking',
        Vdt: basketDetails.Vdt || new Date().toISOString(),
        items: basketDetails.items || basketDetails.Items || [],
        basketNumber: basket.basketNumber,
        id: basket.id,
        NumberOfitem: basketDetails.NoofItem,
        target: basketDetails.Target || 0,
        QcDone: basketDetails.QcDone || 0
      };
      
      if (completeInvoice.items && completeInvoice.items.length > 0) {
        const ocrResult = await sendToOCRQCProcess(completeInvoice.items);
        if (ocrResult) {
          completeInvoice.ocrResult = ocrResult;
        }
      }
      
      if (onInvoiceSelect) {
        onInvoiceSelect(completeInvoice);
      }
      
      if (setInvItems && completeInvoice.items) {
        setInvItems(completeInvoice.items);
      }
      
      closeDropdown();
      await fetchCheckerSummary();
      
    } catch (error) {
      console.error('❌ Failed to select basket:', error);
      
      let userErrorMessage = 'Failed to select basket';
      
      if (error.response && error.response.data && error.response.data.message) {
        userErrorMessage = error.response.data.message;
      } else if (error.message) {
        userErrorMessage = error.message;
      }
      
      setErrorMessage(userErrorMessage);
      setShowError(true);
      
      setTimeout(() => {
        setShowError(false);
        setErrorMessage('');
      }, 5000);
      
    } finally {
      setLoading(false);
    }
  };

  // Calculate scanning progress
  const getScanningProgress = () => {
    const uniqueScannedCount = uniqueItemsCount;
    const totalItems = selectedInvoice?.NumberOfitem || 0;

    return {
      uniqueScannedCount,
      totalItems,
      percentage: totalItems > 0 ? Math.round((uniqueScannedCount / totalItems) * 100) : 0
    };
  };

  // Calculate QC progress
  const getQCProgress = () => {
    const itemQuantity = checkerSummary.itemQuantity || 0;
    const target = checkerSummary.target || 0;
    const percentage = target > 0 ? Math.round((itemQuantity / target) * 100) : 0;
    
    return {
      itemQuantity,
      target,
      percentage,
      completedBills: checkerSummary.completedBills || 0,
      itemCount: checkerSummary.itemCount || 0
    };
  };

  const progress = getScanningProgress();
  const qcProgress = getQCProgress();

  // Improved open dropdown function
  const openDropdown = () => {
    if (isDropdownOpen) return;
    
    setIsDropdownOpen(true);
    setSearchTerm('');
    setFocusedBasketIndex(-1);
    shouldFocusBasketRef.current = false;
    
    // Load baskets if needed
    if (baskets.length === 0) {
      searchBaskets('');
    }
    
    // Focus search input after dropdown opens
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 50);
  };

  // Improved close dropdown function
  const closeDropdown = () => {
    if (!isDropdownOpen) return;
    
    setIsDropdownOpen(false);
    setSearchTerm('');
    setFocusedBasketIndex(-1);
    shouldFocusBasketRef.current = false;
    
    // Return focus to basket button
    setTimeout(() => {
      if (basketButtonRef.current) {
        basketButtonRef.current.focus();
      }
    }, 50);
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  // Handle clear data with confirmation
  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    if (clearLocalStorage) {
      clearLocalStorage();
    }
    setShowClearConfirm(false);
  };

  const cancelClearData = () => {
    setShowClearConfirm(false);
  };

  // Keyboard navigation
  const handleKeyboardNavigation = useCallback((event) => {
    if (!keyboardNavigationEnabled.current) return;
    
    if (isInputFocusedRef.current) {
      if (event.key === 'Escape' && isDropdownOpen) {
        event.preventDefault();
        closeDropdown();
      }
      return;
    }

    const { key, ctrlKey, altKey, metaKey } = event;
    
    if (ctrlKey || altKey || metaKey) return;

    switch (key.toLowerCase()) {
      case '/':
        event.preventDefault();
        if (!isDropdownOpen) {
          openDropdown();
        }
        break;

      case 'f':
      case 'F':
        event.preventDefault();
        if (!isDropdownOpen) {
          openDropdown();
        } else {
          // If dropdown is already open, focus and select search input
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
          }
        }
        break;

      case 'escape':
        if (isDropdownOpen) {
          event.preventDefault();
          closeDropdown();
        }
        break;

      case 'm':
      case 'M':
        if (window.innerWidth < 768) {
          event.preventDefault();
          setIsMobileMenuOpen(!isMobileMenuOpen);
        }
        break;

      default:
        break;
    }
  }, [isDropdownOpen, isInputFocusedRef.current, keyboardNavigationEnabled.current]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  // Auto-scroll to focused item
  useEffect(() => {
    if (!isDropdownOpen || focusedBasketIndex < 0 || filteredBaskets.length === 0) return;

    const scrollToFocusedItem = () => {
      const focusedElement = document.querySelector(`[data-basket-index="${focusedBasketIndex}"]`);
      if (!focusedElement) return;

      const scrollContainer = dropdownRef.current?.querySelector('.max-h-96.overflow-y-auto') || 
                            dropdownRef.current?.querySelector('[class*="overflow-y-auto"]');
      
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = focusedElement.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top;
        const relativeBottom = elementRect.bottom - containerRect.top;
        
        if (relativeTop < 0 || relativeBottom > containerRect.height) {
          focusedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    };

    if (shouldFocusBasketRef.current) {
      const focusedElement = document.querySelector(`[data-basket-index="${focusedBasketIndex}"]`);
      if (focusedElement) {
        focusedElement.focus();
      }
    }

    const timer = setTimeout(scrollToFocusedItem, 10);
    return () => clearTimeout(timer);
  }, [focusedBasketIndex, isDropdownOpen, filteredBaskets]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle search input key events
  const handleSearchKeyDown = (event) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeDropdown();
        break;
        
      case 'ArrowDown':
        if (filteredBaskets.length > 0) {
          event.preventDefault();
          shouldFocusBasketRef.current = true;
          keyboardNavigationEnabled.current = true;
          setFocusedBasketIndex(prev => {
            if (prev < 0) return 0;
            return (prev + 1) % filteredBaskets.length;
          });
        }
        break;
        
      case 'ArrowUp':
        if (filteredBaskets.length > 0) {
          event.preventDefault();
          shouldFocusBasketRef.current = true;
          keyboardNavigationEnabled.current = true;
          setFocusedBasketIndex(prev => {
            if (prev <= 0) return filteredBaskets.length - 1;
            return prev - 1;
          });
        }
        break;
        
      case 'Enter':
        if (filteredBaskets.length > 0) {
          event.preventDefault();
          const indexToSelect = focusedBasketIndex >= 0 ? focusedBasketIndex : 0;
          const basketToSelect = filteredBaskets[indexToSelect];
          if (basketToSelect) {
            handleBasketSelect(basketToSelect);
          }
        }
        break;
        
      case 'Tab':
        // Allow Tab to work normally, but close dropdown if we're on the last item
        if (!event.shiftKey && focusedBasketIndex >= filteredBaskets.length - 1) {
          // Don't prevent default, let Tab work normally
          setTimeout(() => {
            if (isDropdownOpen) {
              closeDropdown();
            }
          }, 10);
        }
        break;
    }
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    shouldFocusBasketRef.current = false;
    setFocusedBasketIndex(-1);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for search
    if (isDropdownOpen) {
      searchTimeoutRef.current = setTimeout(() => {
        searchBaskets(value);
      }, 300);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Basket Item Component
  const BasketItem = React.memo(({ basket, index, isFocused, onClick }) => {
    const itemRef = useRef(null);
    
    useEffect(() => {
      if (isFocused && itemRef.current && shouldFocusBasketRef.current) {
        itemRef.current.focus();
      }
    }, [isFocused]);

    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          onClick();
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (index < filteredBaskets.length - 1) {
            shouldFocusBasketRef.current = true;
            setFocusedBasketIndex(index + 1);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (index > 0) {
            shouldFocusBasketRef.current = true;
            setFocusedBasketIndex(index - 1);
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
            shouldFocusBasketRef.current = false;
            setFocusedBasketIndex(-1);
          }
          break;
        case 'Tab':
          if (!event.shiftKey && index === filteredBaskets.length - 1) {
            // Let Tab work normally, but close dropdown after
            setTimeout(() => {
              if (isDropdownOpen) {
                closeDropdown();
              }
            }, 10);
          }
          break;
      }
    };

    const handleMouseEnter = () => {
      setFocusedBasketIndex(index);
      shouldFocusBasketRef.current = true;
    };

    const handleMouseLeave = () => {
      shouldFocusBasketRef.current = false;
    };

    return (
      <div
        ref={itemRef}
        data-basket-index={index}
        tabIndex={-1}
        role="option"
        aria-selected={isFocused}
        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
          isFocused 
            ? 'bg-blue-100 border-blue-300 shadow-sm' 
            : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-200'
        }`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-900 truncate">
                {basket.basketNumber} 
              </span>
              {basket.invoiceNo && (
                <span className="text-sm font-normal text-gray-600 truncate">
                  (Inv: {basket.invoiceNo})
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 truncate">
              {basket.customerName}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
              <span>{basket.route}</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                basket.status === 'Completed' 
                  ? 'bg-green-100 text-green-800' 
                  : basket.status === 'OnChecking'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {basket.status}
              </span>
            </div>
          </div>
          <button
            className="ml-3 text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label={`Select basket ${basket.basketNumber}`}
          >
            Select
          </button>
        </div>
      </div>
    );
  });

  BasketItem.displayName = 'BasketItem';

  const handleRetryConnection = () => {
    searchBaskets(searchTerm);
  };

  // Error Popup Component
  const ErrorPopup = () => {
    if (!showError) return null;

    return (
      <div className="fixed inset-0 flex items-start justify-center z-[100] p-4 pt-20 pointer-events-none">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-lg max-w-md w-full mx-4">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <FaExclamationTriangle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-sm font-medium text-red-800">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => setShowError(false)}
              className="text-red-500 hover:text-red-700 ml-4 pointer-events-auto"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Clear Data Confirmation Modal
  const ClearDataConfirmationModal = () => {
    if (!showClearConfirm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FaTrashAlt className="h-6 w-6 text-red-600" />
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-center mb-2">Clear All Data</h3>
            
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to clear all saved data? This action cannot be undone and will remove:
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                  Selected invoice information
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                  All scanned medicines data
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                  Workflow progress
                </li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelClearData}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 py-3 px-4 lg:py-4 lg:px-6" ref={headerRef}>
        {/* Main Header - Desktop */}
        <div className="hidden lg:flex justify-between items-center">
          {/* Left Section: Logo, Connection, Basket Selector */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {userName.split(' ')[0]?.[0]}{userName.split(' ')[1]?.[0]}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{userName}</h1>
                <p className="text-sm text-gray-500">Sale Verification System</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="hidden md:flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                socketConnection ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-500">
                {socketConnection ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* OCR Processing Status */}
            {ocrLoading && (
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                <span className="text-xs text-gray-500">Processing OCR...</span>
              </div>
            )}

            {/* Basket Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                ref={basketButtonRef}
                onClick={toggleDropdown}
                className="flex items-center space-x-3 bg-white hover:bg-gray-50 px-4 py-3 rounded-xl border border-gray-300 min-w-80 justify-between transition-all duration-200 hover:shadow-sm group relative"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <div className="flex items-center space-x-2">
                  <FaShoppingBasket className="text-gray-400" />
                  <span className="text-gray-700 font-medium truncate max-w-[200px]">
                    {selectedInvoice ? selectedInvoice.Basket || selectedInvoice.basketNumber : 'Select Basket'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <kbd className="hidden group-hover:inline-flex items-center px-2 py-1 text-xs font-mono text-gray-500 bg-gray-100 rounded border border-gray-300">
                    /
                  </kbd>
                  <FaChevronDown className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isDropdownOpen && (
                <div
                  role="listbox"
                  aria-label="Baskets"
                  className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-900">Basket Selection</h3>
                      {connectionStatus !== 'connected' && (
                        <button
                          onClick={handleRetryConnection}
                          className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          <FaSync className="text-xs" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Enter basket number or search..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => searchBaskets(searchTerm)}
                        disabled={loading}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? '...' : 'Search'}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex items-center space-x-2">
                      <span>Use ↑↓ to navigate</span>
                      <span>•</span>
                      <span>Enter to select</span>
                      <span>•</span>
                      <span>Esc to close</span>
                      <span>•</span>
                      <span>F to search</span>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto p-4">
                    {connectionStatus === 'error' ? (
                      <div className="flex flex-col items-center justify-center py-8 text-red-600">
                        <FaExclamationTriangle className="text-2xl mb-2" />
                        <p className="text-sm font-medium">Connection Failed</p>
                        <button
                          onClick={handleRetryConnection}
                          className="mt-2 text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                        >
                          Retry Connection
                        </button>
                      </div>
                    ) : loading ? (
                      <div className="flex justify-center items-center py-8">
                        <FaSync className="animate-spin text-blue-600 mr-2" />
                        <span>Searching baskets...</span>
                      </div>
                    ) : (
                      <>
                        {filteredBaskets.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold text-gray-700 mb-2">
                              {searchTerm.trim() 
                                ? `Search Results (${filteredBaskets.length})`
                                : `All Baskets (${filteredBaskets.length})`}
                            </h4>
                            <div className="space-y-2" role="presentation">
                              {filteredBaskets.map((basket, index) => (
                                <BasketItem
                                  key={`${basket.id}-${index}`}
                                  basket={basket}
                                  index={index}
                                  isFocused={focusedBasketIndex === index}
                                  onClick={() => handleBasketSelect(basket)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {filteredBaskets.length === 0 && !loading && (
                          <div className="px-4 py-8 text-center text-gray-500">
                            <FaSearch className="mx-auto text-3xl text-gray-300 mb-2" />
                            <p>No baskets found</p>
                            <p className="text-xs mt-1">Try a different search term</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Section: All Progress Information */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Daily QC Progress */}
            <div className="flex items-center space-x-4 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-100 shadow-sm">
              <div className="flex items-center space-x-3">
                <FaChartLine className="text-green-500 text-xl" />
                <div className="text-center">
                  <div className={`text-lg font-bold ${qcProgress.percentage >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                    {qcProgress.itemQuantity}/{qcProgress.target}
                  </div>
                  <div className="text-xs text-gray-500">Items/Target</div>
                </div>
              </div>
              <div className="h-10 w-px bg-green-200"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {qcProgress.completedBills}
                </div>
                <div className="text-xs text-gray-500">Bills Done</div>
              </div>
              <div className="h-10 w-px bg-green-200"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-indigo-600">
                  {qcProgress.itemCount}
                </div>
                <div className="text-xs text-gray-500">Items</div>
              </div>
              <button
                onClick={fetchCheckerSummary}
                disabled={summaryLoading}
                className="ml-2 text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                title="Refresh progress"
              >
                <FaSync className={`text-xs ${summaryLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Current Basket Progress */}
            {selectedInvoice && (
              <div className="flex items-center space-x-4 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100 shadow-sm">
                <div className="text-center min-w-[100px]">
                  <div className="text-lg font-bold text-purple-600 truncate">
                    {selectedInvoice.Route || selectedInvoice.Route}
                  </div>
                  <div className="text-xs text-gray-500">Route</div>
                </div>
                
                {selectedInvoice.CustName && (
                  <>
                    <div className="h-10 w-px bg-blue-200"></div>
                    <div className="text-center max-w-[120px]">
                      <div className="flex items-center space-x-1 text-sm font-semibold text-gray-900">
                        <FaUser className="text-gray-400 text-xs" />
                        <span className="truncate">{selectedInvoice.CustName}</span>
                      </div>
                      <div className="text-xs text-gray-500">Customer</div>
                    </div>
                  </>
                )}

                <div className="h-10 w-px bg-blue-200"></div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {uniqueItemsCount}/{progress.totalItems}
                  </div>
                  <div className="text-xs text-gray-500">Scanned</div>
                </div>

                <div className="relative">
                  <div className="w-12 h-12">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3"
                        strokeDasharray={`${progress.percentage}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-900">
                        {progress.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Clear Data, Save Data & Logout */}
          <div className="flex items-center space-x-4">
            {/* Clear Data Button */}
            <button
              onClick={handleClearData}
              className="flex items-center space-x-2 text-gray-700 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-all duration-200"
              title="Clear all saved data"
            >
              <FaTrashAlt />
              <span className="font-medium">Clear Data</span>
            </button>

            {/* Save Data Button */}

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center space-x-2 text-gray-700 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-all duration-200"
            >
              <FaSignOutAlt />
              <span className="font-medium">Logout</span>
              <kbd className="text-xs bg-gray-100 px-1 rounded border">L</kbd>
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden">
          {/* Top Row - Logo, Action Buttons */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {userName.split(' ')[0]?.[0]}{userName.split(' ')[1]?.[0]}
                </span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">{userName}</h1>
                <p className="text-xs text-gray-500">SVS</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Mobile Save Button */}
              <button
                onClick={saveToLocalStorage}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Save data"
              >
                <FaSave className="h-4 w-4" />
              </button>

              {/* Mobile Clear Data Button */}
              <button
                onClick={handleClearData}
                className="p-2 text-gray-600 hover:text-red-600"
                title="Clear data"
              >
                <FaTrashAlt className="h-4 w-4" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <FaBars className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Basket Selector */}
          <div className="mb-3 relative" ref={dropdownRef}>
            <button
              ref={basketButtonRef}
              onClick={toggleDropdown}
              className="flex items-center justify-between w-full bg-white hover:bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-300 transition-all duration-200 hover:shadow-sm"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <div className="flex items-center space-x-2">
                <FaShoppingBasket className="text-gray-400" />
                <span className="text-gray-700 font-medium truncate">
                  {selectedInvoice ? selectedInvoice.Basket || selectedInvoice.basketNumber : 'Select Basket'}
                </span>
              </div>
              <FaChevronDown className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div
                role="listbox"
                aria-label="Baskets"
                className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
              >
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Enter basket number or search..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full pl-10 pr-16 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => searchBaskets(searchTerm)}
                      disabled={loading}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '...' : 'Go'}
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                    <span>↑↓ to navigate</span>
                    <span>Enter to select</span>
                    <span>Esc to close</span>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto p-2">
                  {connectionStatus === 'error' ? (
                    <div className="flex flex-col items-center justify-center py-6 text-red-600">
                      <FaExclamationTriangle className="text-xl mb-2" />
                      <p className="text-sm font-medium">Connection Failed</p>
                      <button
                        onClick={handleRetryConnection}
                        className="mt-2 text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                      >
                        Retry Connection
                      </button>
                    </div>
                  ) : loading ? (
                    <div className="flex justify-center items-center py-6">
                      <FaSync className="animate-spin text-blue-600 mr-2" />
                      <span>Searching...</span>
                    </div>
                  ) : (
                    <>
                      {filteredBaskets.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-700 mb-2 px-2">
                            {searchTerm.trim() 
                              ? `Search Results (${filteredBaskets.length})`
                              : `All Baskets (${filteredBaskets.length})`}
                          </h4>
                          {filteredBaskets.map((basket, index) => (
                            <div
                              key={basket.id}
                              data-basket-index={index}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors duration-150 ${
                                focusedBasketIndex === index 
                                  ? 'bg-blue-100 border-blue-300 shadow-sm' 
                                  : 'bg-white border-gray-200 hover:bg-blue-50'
                              }`}
                              onClick={() => handleBasketSelect(basket)}
                              onMouseEnter={() => {
                                setFocusedBasketIndex(index);
                                shouldFocusBasketRef.current = true;
                              }}
                              onMouseLeave={() => {
                                shouldFocusBasketRef.current = false;
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 text-sm truncate">
                                    {basket.basketNumber}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {basket.customerName}
                                  </div>
                                </div>
                                <button
                                  className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBasketSelect(basket);
                                  }}
                                >
                                  Select
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {filteredBaskets.length === 0 && !loading && (
                        <div className="px-2 py-6 text-center text-gray-500">
                          <FaSearch className="mx-auto text-xl text-gray-300 mb-2" />
                          <p className="text-sm">No baskets found</p>
                          <p className="text-xs mt-1">Try a different search term</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Progress Display */}
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-4">
            {/* Daily QC Progress - Compact */}
            <div className="flex items-center justify-between sm:justify-start bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-2 rounded-lg border border-green-100">
              <div className="flex items-center space-x-2">
                <FaChartLine className="text-green-500 text-sm" />
                <div className="text-center">
                  <div className={`text-sm font-bold ${qcProgress.percentage >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                    {qcProgress.itemQuantity}/{qcProgress.target}
                  </div>
                  <div className="text-xs text-gray-500">QC</div>
                </div>
              </div>
              <div className="hidden sm:block h-8 w-px bg-green-200 mx-2"></div>
              <div className="flex items-center space-x-4 sm:space-x-2">
                <div className="text-center">
                  <div className="text-sm font-bold text-purple-600">
                    {qcProgress.completedBills}
                  </div>
                  <div className="text-xs text-gray-500">Bills</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-indigo-600">
                    {qcProgress.itemCount}
                  </div>
                  <div className="text-xs text-gray-500">Items</div>
                </div>
              </div>
              <button
                onClick={fetchCheckerSummary}
                disabled={summaryLoading}
                className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                title="Refresh progress"
              >
                <FaSync className={`text-xs ${summaryLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Current Basket Progress - Compact */}
            {selectedInvoice && (
              <div className="flex items-center justify-between sm:justify-start bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 rounded-lg border border-blue-100">
                <div className="text-center min-w-[80px]">
                  <div className="text-sm font-bold text-purple-600 truncate">
                    {selectedInvoice.Basket || selectedInvoice.basketNumber}
                  </div>
                  <div className="text-xs text-gray-500">Basket</div>
                </div>
                
                <div className="hidden sm:block h-8 w-px bg-blue-200 mx-2"></div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-600">
                      {uniqueItemsCount}/{progress.totalItems}
                    </div>
                    <div className="text-xs text-gray-500">Scanned</div>
                  </div>

                  <div className="relative">
                    <div className="w-8 h-8">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="3"
                          strokeDasharray={`${progress.percentage}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-900">
                          {progress.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Modal */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[150] lg:hidden">
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold">Menu</h3>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <FaTimesCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  saveToLocalStorage();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-blue-50 rounded-lg"
              >
                <FaSave className="text-blue-600" />
                <span>Save Data</span>
              </button>
              
              <button
                onClick={() => {
                  handleClearData();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 rounded-lg"
              >
                <FaTrashAlt className="text-red-600" />
                <span>Clear Data</span>
              </button>
              
              <button
                onClick={() => {
                  setShowLogoutConfirm(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 rounded-lg"
              >
                <FaSignOutAlt className="text-red-600" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorPopup />
      <ClearDataConfirmationModal />
    </>
  );
}

export default Header; 