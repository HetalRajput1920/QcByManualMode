import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../Component/Csv-uploader/Header';
import MedicineList from '../Component/Csv-uploader/MedicineList/MedicineList';
import CompletionModal from '../Component/Csv-uploader/CompletionModal';
import { initializeSocket, disconnectSocket } from '../Utility/ConnectionService';
import ManualMedicineAddForm from '../Component/Csv-uploader/MedicineList/ManualMedicine';

function CsvViewer() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [scannedMedicines, setScannedMedicines] = useState([]);
  const [invItems, setInvItems] = useState([]);
  const [socketConnection, setSocketConnection] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState('idle');
  const [showQuantityExceedModal, setShowQuantityExceedModal] = useState(false);
  const [exceededMedicine, setExceededMedicine] = useState(null);
  const [showManualMedicineModal, setShowManualMedicineModal] = useState(false);
  const [availableMedicines, setAvailableMedicines] = useState([]);

  // ================== LOCAL STORAGE CONFIGURATION ==================
  const LOCAL_STORAGE_KEYS = {
    SELECTED_INVOICE: 'csv_viewer_selected_invoice',
    SCANNED_MEDICINES: 'csv_viewer_scanned_medicines',
    INVOICE_ITEMS: 'csv_viewer_invoice_items',
    WORKFLOW_STATUS: 'csv_viewer_workflow_status'
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    try {
      // Load selected invoice
      const savedInvoice = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_INVOICE);
      if (savedInvoice) {
        const parsedInvoice = JSON.parse(savedInvoice);
        setSelectedInvoice(parsedInvoice);
      }

      // Load scanned medicines
      const savedMedicines = localStorage.getItem(LOCAL_STORAGE_KEYS.SCANNED_MEDICINES);
      if (savedMedicines) {
        const parsedMedicines = JSON.parse(savedMedicines);
        setScannedMedicines(parsedMedicines);
      }

      // Load invoice items
      const savedInvItems = localStorage.getItem(LOCAL_STORAGE_KEYS.INVOICE_ITEMS);
      if (savedInvItems) {
        const parsedItems = JSON.parse(savedInvItems);
        setInvItems(parsedItems);
      }

      // Load workflow status
      const savedWorkflowStatus = localStorage.getItem(LOCAL_STORAGE_KEYS.WORKFLOW_STATUS);
      if (savedWorkflowStatus) {
        setWorkflowStatus(savedWorkflowStatus);
      }

    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
      clearLocalStorage();
    }
  }, []);

  // Calculate available medicines (unscanned) whenever invItems or scannedMedicines change
  useEffect(() => {
    if (invItems.length > 0) {
      const unscannedMedicines = calculateUnscannedMedicines();
      setAvailableMedicines(unscannedMedicines);
    }
  }, [invItems, scannedMedicines]);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    try {
      // Save selected invoice
      if (selectedInvoice) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_INVOICE, JSON.stringify(selectedInvoice));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_INVOICE);
      }

      // Save scanned medicines
      if (scannedMedicines.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SCANNED_MEDICINES, JSON.stringify(scannedMedicines));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SCANNED_MEDICINES);
      }

      // Save invoice items
      if (invItems.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.INVOICE_ITEMS, JSON.stringify(invItems));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.INVOICE_ITEMS);
      }

      // Save workflow status
      if (workflowStatus && workflowStatus !== 'idle') {
        localStorage.setItem(LOCAL_STORAGE_KEYS.WORKFLOW_STATUS, workflowStatus);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.WORKFLOW_STATUS);
      }

    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }, [selectedInvoice, scannedMedicines, invItems, workflowStatus]);

  // Clear all data from localStorage
  const clearLocalStorage = () => {
    try {
      Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
  };

  // Function to manually save current state
  const saveToLocalStorage = () => {
    try {
      if (selectedInvoice) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_INVOICE, JSON.stringify(selectedInvoice));
      }
      if (scannedMedicines.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SCANNED_MEDICINES, JSON.stringify(scannedMedicines));
      }
      if (invItems.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.INVOICE_ITEMS, JSON.stringify(invItems));
      }
      if (workflowStatus && workflowStatus !== 'idle') {
        localStorage.setItem(LOCAL_STORAGE_KEYS.WORKFLOW_STATUS, workflowStatus);
      }
      alert('✅ Data saved to browser storage successfully!');
    } catch (error) {
      console.error('❌ Error in manual save:', error);
      alert('❌ Failed to save data. Please check console for details.');
    }
  };

  // Function to manually clear localStorage
  const clearLocalStorageManual = () => {
    
      clearLocalStorage();
      resetWorkflow();
    
  };

  // Add beforeunload event to save data before page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      saveToLocalStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedInvoice, scannedMedicines, invItems, workflowStatus]);

  // Use refs for real-time access to state
  const invItemsRef = useRef(invItems);
  const selectedInvoiceRef = useRef(selectedInvoice);
  const workflowStatusRef = useRef(workflowStatus);
  const scannedMedicinesRef = useRef(scannedMedicines);

  // Update refs when state changes
  useEffect(() => {
    invItemsRef.current = invItems;
    selectedInvoiceRef.current = selectedInvoice;
    workflowStatusRef.current = workflowStatus;
    scannedMedicinesRef.current = scannedMedicines;
  }, [invItems, selectedInvoice, workflowStatus, scannedMedicines]);

  // ================== HELPER FUNCTIONS ==================

  // Calculate unscanned medicines from invoice items
const calculateUnscannedMedicines = useCallback(() => {
  if (!invItems || invItems.length === 0) {
    return [];
  }

  // Remove all unscanned filtering logic
  
  const uniqueMedicines = [];
  const seenCodes = new Set();
  
  invItems.forEach(item => {
    const itemCode = item.Itemc || item.itemc || item.code;
    const normalizedCode = itemCode?.toString().trim();
    
    // Only check for valid medicine codes
    const isValidMedicine = normalizedCode && normalizedCode !== 'undefined';
    
    if (isValidMedicine && !seenCodes.has(normalizedCode)) {
      seenCodes.add(normalizedCode);
      uniqueMedicines.push(item);
    }
  });

  const formattedMedicines = uniqueMedicines.map(item => ({
    item_code: item.Itemc || item.itemc || item.code,
    code: item.Itemc || item.itemc || item.code,
    name: item.ItName || 'Unknown Medicine',
    ItName: item.ItName || 'Unknown Medicine',
    Mrp: item.MRP || item.mrp || 0,
    mrp: item.MRP || item.mrp || 0,
    Pack: item.Pack || item.pack || '',
    pack: item.Pack || item.pack || '',
    Expiry: item.Expiry || item.expiry || '',
    expiry: item.Expiry || item.expiry || '',
    Qty: item.Qty || 0,
    NewQty: item.NewQty || item.Qty || 0,
    ItLocation: item.ItLocation || 'MANUAL',
    Batch: item.Batch || item.batch || '',
    Psrlno: item.Psrlno || item.psrlno || ''
  }));

  return formattedMedicines;
}, [invItems]); 

  // Helper function to get the next ItemSequence
  const getNextItemSequenceForNewBatch = useCallback(() => {
    const currentInvItems = invItemsRef.current;
    const currentScannedMedicines = scannedMedicinesRef.current;

    if (!currentInvItems || currentInvItems.length === 0) {
      return 1;
    }

    let maxSequenceFromInvoice = 0;
    currentInvItems.forEach(item => {
      const sequence = item.ItemSequence || 0;
      if (sequence > maxSequenceFromInvoice) {
        maxSequenceFromInvoice = sequence;
      }
    });

    let maxSequenceFromScanned = 0;
    currentScannedMedicines.forEach(med => {
      if (med.status === 'pending') return;
      const sequence = med.ItemSequence || 0;
      if (sequence > maxSequenceFromScanned) {
        maxSequenceFromScanned = sequence;
      }
    });

    const maxSequence = Math.max(maxSequenceFromInvoice, maxSequenceFromScanned);
    return maxSequence + 1;
  }, []);

  // Helper function to get username from JWT token
  const getUserNameFromToken = (token) => {
    try {
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.username || payload.userName || payload.sub || payload.email || 'unknown';
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Function to restore workflow from localStorage
  const restoreWorkflowFromStorage = useCallback(() => {
    try {
      const savedInvoice = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_INVOICE);
      const savedInvItems = localStorage.getItem(LOCAL_STORAGE_KEYS.INVOICE_ITEMS);
      const savedScanned = localStorage.getItem(LOCAL_STORAGE_KEYS.SCANNED_MEDICINES);
      const savedWorkflow = localStorage.getItem(LOCAL_STORAGE_KEYS.WORKFLOW_STATUS);

      if (savedInvoice && savedInvItems) {
        const parsedInvoice = JSON.parse(savedInvoice);
        const parsedItems = JSON.parse(savedInvItems);
        const parsedScanned = savedScanned ? JSON.parse(savedScanned) : [];
        const parsedWorkflow = savedWorkflow || 'ready_to_scan';

        if (parsedInvoice && parsedItems.length > 0) {
          setSelectedInvoice(parsedInvoice);
          setInvItems(parsedItems);
          setScannedMedicines(parsedScanned);
          setWorkflowStatus(parsedWorkflow);
          setLastError(null);
          return true;
        }
      }
    } catch (error) {
      console.error('❌ Error restoring workflow:', error);
    }
    return false;
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = getUserNameFromToken(token);

    if (token && username) {
      const socket = initializeSocket(token, username);

      socket.on('connect', () => {
        setSocketConnection(true);
        setLastError(null);
        restoreWorkflowFromStorage();
      });

      socket.on('disconnect', () => {
        setSocketConnection(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setSocketConnection(false);
        setLastError('Connection failed. Please check your network.');
      });

      socket.on('qc_product_verified', (data) => {
        const currentWorkflowStatus = workflowStatusRef.current;
        const currentSelectedInvoice = selectedInvoiceRef.current;
        const currentInvItems = invItemsRef.current;

        const hasSelectedInvoice = currentSelectedInvoice || selectedInvoice;
        const hasInvoiceItems = (currentInvItems && currentInvItems.length > 0) || (invItems && invItems.length > 0);

        if (!hasSelectedInvoice || !hasInvoiceItems) {
          console.error('❌ Scanner data received but no invoice selected or loaded');
          const restored = restoreWorkflowFromStorage();
          if (restored) {
            setTimeout(() => {
              handleMedicineScanned(data);
            }, 500);
            return;
          }
          setLastError('Please select an invoice first before scanning.');
          return;
        }

        const allowedStates = ['ready_to_scan', 'scanning', 'completed'];
        if (!allowedStates.includes(currentWorkflowStatus)) {
          console.error('❌ Scanner data received but workflow not ready. Current status:', currentWorkflowStatus);
          if (hasSelectedInvoice && hasInvoiceItems && currentWorkflowStatus === 'idle') {
            setWorkflowStatus('ready_to_scan');
            setTimeout(() => {
              handleMedicineScanned(data);
            }, 300);
            return;
          }
          setLastError('Please select an invoice first before scanning.');
          return;
        }

        if (data && data.error) {
          console.error('Backend error:', data.error);
          setLastError(data.error);
          return;
        }

        if (data && data.matched_product) {
          handleMedicineScanned(data);
          setLastError(null);
        } else {
          console.error('Invalid data structure received:', data);
          setLastError(data?.message);
          if (data?.message === "batch not found in database.")
            setShowManualMedicineModal(true)
        }
      });

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('qc_product_verified');
        disconnectSocket();
      };
    } else {
      console.error('No token or username found');
      setLastError('Authentication error. Please login again.');
    }
  }, []);

  // STEP 1: User selects invoice - Automatically adds all medicines
  const handleInvoiceSelect = (invoice) => {
    if (!invoice) {
      resetWorkflow();
      return;
    }

    setScannedMedicines([]);
    setLastError(null);
    setWorkflowStatus('invoice_selected');

    let items = invoice.items || invoice.Items || invoice.invoiceItems || [];
    if (items.length === 0) {
      console.error('❌ No items found in selected invoice');
      setLastError('Selected invoice has no items');
      setWorkflowStatus('idle');
      return;
    }

    setSelectedInvoice({
      ...invoice,
      originalItems: items
    });

    setInvItems(items);
    addAllMedicinesToScannedList(items);

    setTimeout(() => {
      setWorkflowStatus('ready_to_scan');
    }, 100);
  };

  // Function to automatically add all medicines to scanned list
  const addAllMedicinesToScannedList = (items) => {
    if (!items || items.length === 0) {
      return;
    }

    const newMedicines = items.map((item, index) => {
      const itemCode = item.Itemc || item.itemc || item.code;
      const itemName = item.ItName || 'Unknown Medicine';
      const batch = item.Batch || item.batch || item.NewBatch || '';
      const expectedQty = item.NewQty || 0;
      const itemSequence = item.ItemSequence || (index + 1);

      const alreadyScanned = scannedMedicines?.some(med => {
        const medCode = med.code || med.Itemc || med.itemc;
        const medBatch = med.batch || med.Batch || med.actualBatch || med.NewBatch;
        return medCode.toString() === itemCode.toString() &&
          (medBatch === batch || !batch || !medBatch);
      });

      if (alreadyScanned) {
        return null;
      }

      return {
        id: `auto_added_${Date.now()}_${index}`,
        name: itemName,
        code: itemCode,
        batch: batch,
        Batch: batch,
        NewBatch: batch,
        mrp: item.MRP || '',
        expiry: item.Expiry || '',
        pack: item.Pack || '',
        quantity: 0,
        scannedQty: 0,
        expectedQty: expectedQty,
        status: 'pending',
        timestamp: new Date().toLocaleTimeString(),
        scannedAt: new Date().toISOString(),
        isManualAdjustment: false,
        isManualEntry: false,
        isAutoAdded: true,
        verifiedBy: 'System Auto-Add',
        success: false,
        similarity: 0,
        mismatches: {},
        Vtype: item.Vtype || "SB",
        Vdt: item.Vdt || new Date().toISOString().split('T')[0],
        Vno: item.Vno || 0,
        Acno: item.Acno || 0,
        ItName: itemName,
        Pack: item.Pack || "",
        ItLocation: item?.ItLocation || "MANUAL",
        Itemc: itemCode,
        Expiry: item.Expiry || "",
        MRP: parseFloat(item.MRP) || 0,
        Qty: parseFloat(item.Qty) || 0,
        TrayID: item.TrayID || 0,
        ItemSequence: itemSequence,
        PickerID: item.PickerID || 0,
        CheckerID: item.CheckerID || 0,
        NewQty: expectedQty,
        IsDelete: item.IsDelete || -1,
        Reason: item.Reason || null,
        Status: item.Status || "P",
        PickQty: item.PickQty || 0,
        PickTime: item.PickTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
        CheckTime: item.CheckTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
        PorderNo: item.PorderNo || 0,
        psrlno: item.Psrlno || ''
      };
    }).filter(item => item !== null);

    if (newMedicines.length === 0) {
      return;
    }

    setScannedMedicines(prev => {
      return [...newMedicines, ...prev];
    });
  };

  // Use effect to handle automatic adding when invItems changes
  useEffect(() => {
    if (invItems && invItems.length > 0 && workflowStatus === 'invoice_selected') {
      setTimeout(() => {
        addAllMedicinesToScannedList(invItems);
      }, 200);
    }
  }, [invItems, workflowStatus]);

  // ================== CENTRALIZED QUANTITY EXCEED HANDLER ==================

  /**
   * Calculate TOTAL expected quantity for an item code (across ALL batches)
   */
  const getTotalExpectedQuantityForItemCode = useCallback((itemCode) => {
    const currentInvItems = invItemsRef.current;
    if (!currentInvItems || currentInvItems.length === 0) {
      return 0;
    }

    const searchCode = itemCode?.toString().trim();
    if (!searchCode) return 0;

    const totalExpectedQty = currentInvItems.reduce((sum, item) => {
      const invoiceItemCode = item.Itemc || item.itemc || item.code || item.ItemCode || item.itemCode;
      const invoiceCode = invoiceItemCode?.toString().trim();
      if (invoiceCode === searchCode) {
        const qty = item.NewQty || item.Qty || 0;
        return sum + qty;
      }
      return sum;
    }, 0);

    return totalExpectedQty;
  }, []);


  const getTotalScannedQuantityForItemCode = useCallback((itemCode) => {
    const currentScannedMedicines = scannedMedicinesRef.current;
    if (!currentScannedMedicines || currentScannedMedicines.length === 0) {
      return 0;
    }

    const searchCode = itemCode?.toString().trim();
    if (!searchCode) return 0;

    const totalScannedQty = currentScannedMedicines.reduce((sum, med) => {
      if (med.status === 'pending' || (med.scannedQty === 0 && med.quantity === 0)) {
        return sum;
      }

      const medCode = med.code || med.Itemc || med.itemc;
      const normalizedMedCode = medCode?.toString().trim();
      if (normalizedMedCode === searchCode) {
        const itemQty = med.scannedQty || med.quantity || 1;
        return sum + itemQty;
      }
      return sum;
    }, 0);

    return totalScannedQty;
  }, []);

  /**
   * CENTRALIZED: Check if quantity will be exceeded based on ITEM CODE ONLY
   */
  const checkQuantityExceeded = useCallback((itemCode, isScanning = true) => {
    const totalExpectedQty = getTotalExpectedQuantityForItemCode(itemCode);
    const currentScannedQty = getTotalScannedQuantityForItemCode(itemCode);
    const willExceedAfterScan = isScanning ? (currentScannedQty + 1) > totalExpectedQty : currentScannedQty > totalExpectedQty;

    return {
      willExceed: willExceedAfterScan,
      currentQty: currentScannedQty,
      expectedQty: totalExpectedQty,
      reason: willExceedAfterScan ?
        `Total scanned quantity (${currentScannedQty + (isScanning ? 1 : 0)}) exceeds total expected quantity (${totalExpectedQty}) for this item code` :
        'Quantity within limits'
    };
  }, [getTotalExpectedQuantityForItemCode, getTotalScannedQuantityForItemCode]);

  const findInvoiceItemsByCode = useCallback((itemCode) => {
    const currentInvItems = invItemsRef.current;
    if (!currentInvItems || currentInvItems.length === 0) {
      return [];
    }

    const searchCode = itemCode?.toString().trim();
    if (!searchCode) return [];

    const matchingItems = currentInvItems.filter((item) => {
      const invoiceItemCode = item.Itemc || item.itemc || item.code || item.ItemCode || item.itemCode;
      const invoiceCode = invoiceItemCode?.toString().trim();
      return invoiceCode === searchCode;
    });

    return matchingItems;
  }, []);

  /**
   * Get batch distribution for an item code
   */
  const getBatchDistributionForItemCode = useCallback((itemCode) => {
    const invoiceItems = findInvoiceItemsByCode(itemCode);
    const batchDistribution = {};
    
    invoiceItems.forEach(item => {
      const batch = item.Batch || item.batch || item.NewBatch || 'No Batch';
      const qty = item.NewQty || item.Qty || 0;

      if (!batchDistribution[batch]) {
        batchDistribution[batch] = {
          batch: batch,
          expectedQty: qty,
          scannedQty: 0
        };
      } else {
        batchDistribution[batch].expectedQty += qty;
      }
    });

    const currentScannedMedicines = scannedMedicinesRef.current;
    currentScannedMedicines.forEach(med => {
      if (med.status === 'pending') return;

      const medCode = med.code || med.Itemc || med.itemc;
      const normalizedMedCode = medCode?.toString().trim();
      const normalizedSearchCode = itemCode?.toString().trim();

      if (normalizedMedCode === normalizedSearchCode) {
        const batch = med.batch || med.Batch || med.actualBatch || med.NewBatch || 'No Batch';
        if (batchDistribution[batch]) {
          batchDistribution[batch].scannedQty += 1;
        } else {
          batchDistribution[batch] = {
            batch: batch,
            expectedQty: 0,
            scannedQty: 1
          };
        }
      }
    });

    return Object.values(batchDistribution);
  }, [findInvoiceItemsByCode]);

  /**
   * Centralized function to show quantity exceed modal
   */
  const showExceedModal = useCallback((itemCode, medicineName) => {
    const totalExpectedQty = getTotalExpectedQuantityForItemCode(itemCode);
    const currentScannedQty = getTotalScannedQuantityForItemCode(itemCode);
    const batchDistribution = getBatchDistributionForItemCode(itemCode);

    setExceededMedicine({
      itemCode,
      medicineName,
      currentQty: currentScannedQty,
      expectedQty: totalExpectedQty,
      batchDistribution: batchDistribution,
      totalExpectedQty: totalExpectedQty,
      totalScannedQty: currentScannedQty
    });

    setShowQuantityExceedModal(true);
  }, [getTotalExpectedQuantityForItemCode, getTotalScannedQuantityForItemCode, getBatchDistributionForItemCode]);

  /**
   * Centralized function to handle quantity exceed confirmation
   */
  const handleQuantityExceedConfirm = useCallback((proceedAnyway = false) => {
    if (proceedAnyway) {
      console.warn('⚠️ Quantity exceeded but user chose to proceed anyway:', exceededMedicine);
    }
    setShowQuantityExceedModal(false);
    setExceededMedicine(null);
  }, [exceededMedicine]);

  /**
   * Use this function when manually adjusting quantities in MedicineList
   */
  const checkManualQuantityAdjustment = useCallback((medicine, newQuantity) => {
    const itemCode = medicine.code || medicine.Itemc || medicine.itemc;
    const quantityCheck = checkQuantityExceeded(itemCode, false);
    if (newQuantity > quantityCheck.expectedQty) {
      showExceedModal(itemCode, medicine.name);
      return false;
    }
    return true;
  }, [checkQuantityExceeded, showExceedModal]);

  // Helper function to find invoice item by code + batch only
  const findInvoiceItemByCodeAndBatchAndPsrlno = useCallback((itemCode, batch, psrlno, currentInvItems) => {
    if (!currentInvItems || currentInvItems.length === 0) {
      console.warn('❌ No invoice items available');
      return null;
    }

    const searchCode = itemCode?.toString().trim();
    const searchBatch = batch?.toString().trim();
    const searchPsrlno = psrlno?.toString().trim();

    const match = currentInvItems.find((item) => {
      const itemCodeFromInvoice = item.Itemc || item.itemc || item.code || item.ItemCode || item.itemCode || item.Code;
      const batchFromInvoice = item.Batch || item.batch || item.NewBatch || item.BATCH;
      const psrlnoFromInvoice = item.Psrlno || item.psrlno || item.PSRLNO;

      if (!itemCodeFromInvoice || !batchFromInvoice || !psrlnoFromInvoice) return false;

      const invoiceCode = itemCodeFromInvoice.toString().trim();
      const invoiceBatch = batchFromInvoice.toString().trim();
      const invoicePsrlno = psrlnoFromInvoice.toString().trim();

      return invoiceCode === searchCode &&
        invoiceBatch === searchBatch &&
        invoicePsrlno === searchPsrlno;
    });

    if (match) {
      return match;
    }

    return null;
  }, []);

  // ================== MAIN SCANNING HANDLER ==================
  const handleMedicineScanned = useCallback((backendData) => {
    const currentWorkflowStatus = workflowStatusRef.current;
    const currentInvItems = invItemsRef.current;
    const currentSelectedInvoice = selectedInvoiceRef.current;
    const currentScannedMedicines = scannedMedicinesRef.current;

    const now = Date.now();
    if (lastScanTimeRef.current && (now - lastScanTimeRef.current) < 1000) {
      return;
    }
    lastScanTimeRef.current = now;

    const hasSelectedInvoice = currentSelectedInvoice || selectedInvoice;
    const hasInvoiceItems = (currentInvItems && currentInvItems.length > 0) || (invItems && invItems.length > 0);

    if (!hasSelectedInvoice || !hasInvoiceItems) {
      console.error('❌ Cannot process scan - no invoice selected or loaded');
      setLastError('Please select an invoice first before scanning.');

      const savedInvoice = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_INVOICE);
      const savedInvItems = localStorage.getItem(LOCAL_STORAGE_KEYS.INVOICE_ITEMS);

      if (savedInvoice && savedInvItems) {
        try {
          const parsedInvoice = JSON.parse(savedInvoice);
          const parsedItems = JSON.parse(savedInvItems);
          if (parsedInvoice && parsedItems.length > 0) {
            setSelectedInvoice(parsedInvoice);
            setInvItems(parsedItems);
            setWorkflowStatus('ready_to_scan');
            setLastError(null);
            return;
          }
        } catch (error) {
          console.error('❌ Error restoring from localStorage:', error);
        }
      }
      return;
    }

    const allowedStates = ['ready_to_scan', 'scanning', 'completed'];
    if (!allowedStates.includes(currentWorkflowStatus)) {
      console.error('❌ Cannot process scan - workflow not ready. Current status:', currentWorkflowStatus);
      setLastError('Please select an invoice first before scanning.');
      return;
    }

    if (!currentInvItems || currentInvItems.length === 0) {
      console.error('❌ No invoice items available for matching');
      setLastError('No invoice items loaded. Please select an invoice first.');
      return;
    }

    const matchedProduct = backendData.matched_product;
    if (!matchedProduct) {
      console.error('❌ No matched product in backend data');
      setLastError('Invalid scan data received');
      return;
    }

    const medicineName = matchedProduct.name || matchedProduct.Name || 'Unknown Medicine';
    const itemCode = matchedProduct.itemc || matchedProduct.item_code || matchedProduct.code || '';
    const batch = matchedProduct.Batch || matchedProduct.batch || '';
    const mrp = matchedProduct.Mrp || matchedProduct.mrp || '';
    const pack = matchedProduct.Pack || matchedProduct.pack || '';
    const expiry = matchedProduct.Expiry || matchedProduct.expiry || '';
    const quantity = matchedProduct.qty || matchedProduct.quantity || 1;
    const psrlno = backendData.psrlno || '';

    const quantityCheck = checkQuantityExceeded(itemCode, true);
    if (quantityCheck.willExceed) {
      console.warn('⚠️ Quantity exceeded for item code:', itemCode);
      showExceedModal(itemCode, medicineName);
      return;
    }

    if (currentWorkflowStatus !== 'completed') {
      setWorkflowStatus('scanning');
    }

    const invoiceItem = findInvoiceItemByCodeAndBatchAndPsrlno(itemCode, batch, psrlno, currentInvItems);
    let isNewBatch = false;
    if (!invoiceItem) {
      console.warn('⚠️ No invoice item found for code and batch:', { itemCode, batch });
      isNewBatch = true;
      setLastError(`New batch detected: ${itemCode}, batch: ${batch}`);
    }

    let status = 'matched';
    const mismatches = backendData.mismatches || {};
    const isMismatchBatch = !!mismatches.batch;
    const isMismatchPack = !!mismatches.pack;
    const isMismatchExpiry = !!mismatches.expiry;
    const isMismatchMrp = !!mismatches.mrp;

    const isMismatched = !backendData.success || backendData.similarity < 0.9 ||
      isMismatchBatch || isMismatchPack || isMismatchExpiry || isMismatchMrp;

    if (isMismatched) {
      status = 'mismatched';
    }

    const existingScannedItem = currentScannedMedicines.find(med => {
      const medCode = med.code || med.Itemc || med.itemc;
      const medBatch = med.batch || med.Batch || med.actualBatch || med.NewBatch;
      const medPsrlno = med.psrlno || med.Psrlno || '';
      const codeMatches = medCode?.toString() === itemCode?.toString();
      const batchMatches = medBatch?.toString() === batch?.toString();
      const psrlnoMatches = medPsrlno?.toString() === psrlno?.toString();
      return codeMatches && batchMatches && psrlnoMatches && med.status !== 'pending';
    });

    if (existingScannedItem) {
      const updatedMedicineData = {
        ...existingScannedItem,
        quantity: (existingScannedItem.quantity || 0) + 1,
        scannedQty: (existingScannedItem.scannedQty || 0) + 1,
        timestamp: new Date().toLocaleTimeString(),
        lastScannedAt: new Date().toISOString()
      };

      setScannedMedicines(prev => {
        const filtered = prev.filter(med => med.id !== existingScannedItem.id);
        const updated = [updatedMedicineData, ...filtered];

        if (currentInvItems.length > 0) {
          const scannedUniqueItems = new Set();
          updated.forEach(med => {
            if (med.status === 'pending') return;
            const medCode = med.code || med.Itemc || med.itemc;
            const medBatch = med.batch || med.Batch || med.actualBatch || med.NewBatch;
            const medPsrlno = med.psrlno || med.Psrlno || '';
            const key = `${medCode}_${medBatch}_${medPsrlno}`;
            scannedUniqueItems.add(key);
          });

          if (scannedUniqueItems.size >= currentInvItems.length) {
            setWorkflowStatus('completed');
          }
        }

        return updated;
      });

      setLastError(null);
      return;
    }

    let itemSequence = getNextItemSequenceForNewBatch();
    if (isNewBatch) {
      console.log('New batch detected, using sequence:', itemSequence);
    }

    // Helper function to find invoice item by code only (for location lookup)
    const findInvoiceItemByCode = (itemCode) => {
      const currentInvItems = invItemsRef.current;
      if (!currentInvItems || currentInvItems.length === 0) {
        return null;
      }

      const searchCode = itemCode?.toString().trim();
      if (!searchCode) return null;

      // Find ANY invoice item with matching code to get location
      const match = currentInvItems.find((item) => {
        const itemCodeFromInvoice = item.Itemc || item.itemc || item.code || item.ItemCode || item.itemCode || item.Code;
        const invoiceCode = itemCodeFromInvoice?.toString().trim();
        return invoiceCode === searchCode;
      });

      return match;
    };


// STEP: Create merged medicine data with the helper function inside
const createMergedMedicineData = ({
  matchedProduct,
  invoiceItem,
  backendData,
  status,
  mismatches,
  isMismatchBatch,
  isMismatchPack,
  isMismatchExpiry,
  isMismatchMrp,
  medicineName,
  itemCode,
  batch,
  mrp,
  pack,
  expiry,
  quantity,
  isNewBatch = false,
  newItemSequence = null
}) => {
  const currentInvoice = selectedInvoiceRef.current;

  // Determine ItemSequence
  let itemSequence;
  if (isNewBatch && newItemSequence) {
    itemSequence = newItemSequence;
  } else if (invoiceItem && backendData.success) {
    itemSequence = invoiceItem.ItemSequence || 0;
  } else {
    itemSequence = newItemSequence || getNextItemSequenceForNewBatch();
  }

  // FIXED: Find location and other invoice fields by code if invoiceItem not found or mismatched
  let itLocation = invoiceItem?.ItLocation;
  let trayId = invoiceItem?.TrayID || 0;
  let pickerId = invoiceItem?.PickerID || 0;
  let checkerId = invoiceItem?.CheckerID || 0;
  let expectedQtyFromInvoice = invoiceItem?.NewQty || invoiceItem?.Qty || 1;
  let invoiceBatch = invoiceItem?.Batch || batch;
  let invoicePack = invoiceItem?.Pack || pack;
  let invoiceExpiry = invoiceItem?.Expiry || expiry;
  let invoiceMrp = invoiceItem?.MRP || mrp;
  let invoiceItemCode = invoiceItem?.Itemc || itemCode;
  let invoiceItName = invoiceItem?.ItName || medicineName;
  
  // If not found from exact match, try to find by code only
  if (!invoiceItem && itemCode) {
    const locationItem = findInvoiceItemByCode(itemCode);
    if (locationItem) {
      itLocation = locationItem?.ItLocation || itLocation;
      trayId = locationItem?.TrayID || trayId;
      pickerId = locationItem?.PickerID || pickerId;
      checkerId = locationItem?.CheckerID || checkerId;
      expectedQtyFromInvoice = locationItem?.NewQty || locationItem?.Qty || expectedQtyFromInvoice;
      invoiceBatch = locationItem?.Batch || invoiceBatch;
      invoicePack = locationItem?.Pack || invoicePack;
      invoiceExpiry = locationItem?.Expiry || invoiceExpiry;
      invoiceMrp = locationItem?.MRP || invoiceMrp;
      invoiceItemCode = locationItem?.Itemc || invoiceItemCode;
      invoiceItName = locationItem?.ItName || invoiceItName;
    }
  }

  // Fallback to 'MANUAL' only if truly not found
  itLocation = itLocation || 'MANUAL';

  // Base data from scan
  const baseData = {
    ...matchedProduct,
    id: `${itemCode}_${batch}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: medicineName,
    ItLocation: itLocation, // Use the found location
    code: itemCode,
    batch: batch,
    mrp: mrp,
    pack: pack,
    expiry: expiry,
    quantity: quantity,
    scannedQty: 1,
    status: status,
    timestamp: new Date().toLocaleTimeString(),
    scannedAt: new Date().toISOString(),
    verifiedBy: 'Mobile Scanner',
    isMismatchBatch: isMismatchBatch,
    isMismatchPack: isMismatchPack,
    isMismatchExpiry: isMismatchExpiry,
    isMismatchMrp: isMismatchMrp,
    actualBatch: mismatches.batch || batch,
    actualPack: mismatches.pack || pack,
    actualExpiry: mismatches.expiry || expiry,
    actualMrp: mismatches.mrp || mrp,
    expectedBatch: invoiceBatch, // Use invoice batch
    expectedPack: invoicePack, // Use invoice pack
    expectedExpiry: invoiceExpiry, // Use invoice expiry
    expectedMrp: invoiceMrp, // Use invoice MRP
    success: backendData.success && !isMismatchBatch && !isMismatchPack && !isMismatchExpiry && !isMismatchMrp,
    similarity: backendData.similarity || 0,
    mismatches: mismatches,
    originalData: backendData,
    isManualAdjustment: false,
    isManualEntry: false,
    isAutoAdded: false,
    invoiceItemFound: !!invoiceItem,
    isNewBatchItem: isNewBatch,
    ItemSequence: itemSequence,
    clqty:invoiceItem?.clqty || 0
  };

  // Merge with invoice item data if found OR if we have location data
  if (invoiceItem && backendData.success) {
    const expectedQty = invoiceItem.NewQty || invoiceItem.Qty || 1;

    return {
      ...baseData,
      Vtype: invoiceItem.Vtype || 'SB',
      Vdt: invoiceItem.Vdt || currentInvoice?.Vdt || new Date().toISOString().split('T')[0],
      Vno: invoiceItem.Vno || currentInvoice?.InvoiceNo || 0,
      Acno: invoiceItem.Acno || currentInvoice?.Acno || 0,
      ItName: invoiceItem.ItName || medicineName,
      Pack: invoiceItem.Pack || pack,
      Itemc: invoiceItem.Itemc || itemCode,
      Batch: invoiceItem.Batch || batch,
      Expiry: invoiceItem.Expiry || expiry,
      MRP: invoiceItem.MRP || mrp,
      Qty: invoiceItem.Qty || quantity,
      NewQty: expectedQty,
      expectedQty: expectedQty,
      ItLocation: itLocation, // Use the found location
      TrayID: trayId, // Use the found TrayID
      PickerID: pickerId, // Use the found PickerID
      CheckerID: checkerId, // Use the found CheckerID
      NewBatch: invoiceItem.NewBatch || batch,
      IsDelete: invoiceItem.IsDelete || -1,
      Reason: invoiceItem.Reason || '',
      Status: invoiceItem.Status || 'C',
      PickQty: invoiceItem.PickQty || 0,
      PickTime: invoiceItem.PickTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
      CheckTime: invoiceItem.CheckTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
      PorderNo: invoiceItem.PorderNo || 0,
      psrlno: backendData.psrlno || invoiceItem.Psrlno || '',
      expectedBatch: invoiceItem.Batch || batch,
      expectedPack: invoiceItem.Pack || pack,
      expectedExpiry: invoiceItem.Expiry || expiry,
      expectedMrp: invoiceItem.MRP || mrp
    };
  } else {
    // For mismatched items or when no invoice item found, but we have location data
    const expectedQty = expectedQtyFromInvoice;

    return {
      ...baseData,
      Vtype: 'SB',
      Vdt: currentInvoice?.Vdt || new Date().toISOString().split('T')[0],
      Vno: currentInvoice?.InvoiceNo || 0,
      Acno: currentInvoice?.Acno || 0,
      ItName: invoiceItName, // Use invoice item name
      ItLocation: itLocation, // Use the found location
      Itemc: invoiceItemCode, // Use invoice item code
      Batch: batch,
      Expiry: expiry,
      MRP: mrp,
      Qty: quantity,
      NewQty: expectedQty,
      expectedQty: expectedQty,
      TrayID: trayId, // Use the found TrayID
      PickerID: pickerId, // Use the found PickerID
      CheckerID: checkerId, // Use the found CheckerID
      NewBatch: batch,
      IsDelete: -1,
      Reason: '',
      Status: 'C',
      PickQty: 0,
      PickTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      CheckTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      PorderNo: 0,
      psrlno: backendData.psrlno || '',
      invoiceItemFound: !!invoiceItem
    };
  }
};

    const mergedMedicineData = createMergedMedicineData({
      matchedProduct,
      invoiceItem,
      backendData,
      status,
      mismatches,
      isMismatchBatch,
      isMismatchPack,
      isMismatchExpiry,
      isMismatchMrp,
      medicineName,
      itemCode,
      batch,
      psrlno,
      mrp,
      pack,
      expiry,
      quantity,
      isNewBatch: isNewBatch,
      newItemSequence: itemSequence
    });

    setScannedMedicines(prev => {
      const updated = [mergedMedicineData, ...prev];

      if (currentInvItems.length > 0) {
        const scannedUniqueItems = new Set();
        updated.forEach(med => {
          if (med.status === 'pending') {
            return;
          }
          const medCode = med.code || med.Itemc || med.itemc;
          const medBatch = med.batch || med.Batch || med.actualBatch || med.NewBatch;
          const medPsrlno = med.psrlno || med.Psrlno || '';
          const key = `${medCode}_${medBatch}_${medPsrlno}`;
          scannedUniqueItems.add(key);
        });

        if (scannedUniqueItems.size >= currentInvItems.length) {
          setWorkflowStatus('completed');
        }
      }

      return updated;
    });

    setLastError(null);
  }, [findInvoiceItemByCodeAndBatchAndPsrlno, getNextItemSequenceForNewBatch, showExceedModal, checkQuantityExceeded]);

  const lastScanTimeRef = useRef(0);

  // Reset workflow (also clears localStorage)
  const resetWorkflow = () => {
    setSelectedInvoice(null);
    setInvItems([]);
    setScannedMedicines([]);
    setLastError(null);
    setWorkflowStatus('idle');
    clearLocalStorage();
  };

  // Continue scanning function
  const handleContinueScanning = () => {
    if (workflowStatus === 'completed') {
      setWorkflowStatus('scanning');
      setLastError(null);
    }
  };

  // Logout functions
  const confirmLogout = () => {
    saveToLocalStorage();
    localStorage.removeItem('token');
    disconnectSocket();
    window.location.href = '/login';
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleMedicineUpdate = (updatedMedicines) => {
    setScannedMedicines(updatedMedicines);
  };

  const handleCompleteScanning = () => {
    const unresolvedMismatches = scannedMedicines.filter(
      med => med.status === 'mismatched' && !med.resolution
    ).length;

    if (unresolvedMismatches > 0) {
      if (!window.confirm(`There are ${unresolvedMismatches} unresolved mismatches. Do you want to proceed anyway?`)) {
        return;
      }
    }

    setShowCompletionModal(true);
  };

  const handleConfirmCompletion = () => {
    const approvedCount = scannedMedicines.filter(med =>
      med.status === 'matched' || med.resolution === 'accepted'
    ).length;

    const rejectedCount = scannedMedicines.filter(med =>
      med.resolution === 'rejected'
    ).length;

    resetWorkflow();
    setShowCompletionModal(false);
  };

  // Calculate unique scanned items by item code + batch only (EXCLUDING PENDING ITEMS)
  const getUniqueScannedItems = () => {
    if (!scannedMedicines || scannedMedicines.length === 0) return 0;

    const uniqueItems = new Set();
    scannedMedicines.forEach(medicine => {
      if (medicine.status === 'pending') {
        return;
      }
      const medCode = medicine.code || medicine.Itemc || medicine.itemc;
      const medBatch = medicine.batch || medicine.Batch || medicine.actualBatch;
      const key = `${medCode}_${medBatch}`;
      uniqueItems.add(key);
    });

    return uniqueItems.size;
  };

  // Calculate grouped medicines for header display using code + batch only
  const getGroupedMedicinesForHeader = () => {
    if (!scannedMedicines || scannedMedicines.length === 0) return [];

    const grouped = {};
    scannedMedicines.forEach(medicine => {
      if (medicine.status === 'pending') {
        return;
      }
      const medCode = medicine.code || medicine.Itemc || medicine.itemc;
      const medBatch = medicine.batch || medicine.Batch || medicine.actualBatch;
      const key = `${medCode}_${medBatch}`;

      if (!grouped[key]) {
        grouped[key] = {
          code: medCode,
          name: medicine.name,
          batch: medBatch,
          scannedQty: 1,
          expectedQty: medicine.Qty || 1,
          status: medicine.status,
          isMismatchBatch: medicine.isMismatchBatch,
          isMismatchPack: medicine.isMismatchPack,
          isMismatchExpiry: medicine.isMismatchExpiry,
          isMismatchMrp: medicine.isMismatchMrp
        };
      } else {
        grouped[key].scannedQty += 1;
      }
    });

    return Object.values(grouped);
  };

  const scanningProgress = {
    scannedCount: getUniqueScannedItems(),
    uniqueScannedCount: getUniqueScannedItems(),
    totalCount: invItems.NumberOfitem,
    approvedCount: scannedMedicines.filter(med =>
      med.status === 'matched' || med.resolution === 'accepted'
    ).length,
    unresolvedMismatches: scannedMedicines.filter(
      med => med.status === 'mismatched' && !med.resolution
    ).length,
    workflowStatus: workflowStatus,
    groupedMedicines: getGroupedMedicinesForHeader()
  };

  // Handle verification completion from MedicineList
  const handleVerificationComplete = (result) => {
    clearLocalStorage();
    resetWorkflow();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Local Storage Controls - Add to Header or as floating button */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="flex space-x-2">
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
            <p className="mb-6 text-gray-600">Are you sure you want to logout? Data will be saved to browser storage.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Exceed Modal - ITEM CODE BASED */}
      {showQuantityExceedModal && exceededMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-orange-600">
              ⚠️ Total Quantity Exceeded
            </h3>

            <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <svg className="h-6 w-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-medium text-gray-900 text-lg">{exceededMedicine.medicineName}</p>
                  <p className="text-gray-600 mt-1">
                    <span className="font-medium">Item Code:</span> {exceededMedicine.itemCode}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm text-gray-500">Total Expected</p>
                      <p className="text-lg font-bold text-blue-600">{exceededMedicine.totalExpectedQty}</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm text-gray-500">Total Scanned</p>
                      <p className="text-lg font-bold text-orange-600">{exceededMedicine.totalScannedQty + 1}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <p className="text-red-600 font-medium">
                      <span className="font-bold">Exceeded by:</span> {exceededMedicine.totalScannedQty + 1 - exceededMedicine.totalExpectedQty} items
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Batch Distribution Table */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Batch-wise Distribution:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scanned Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exceededMedicine.batchDistribution && exceededMedicine.batchDistribution.map((batch, index) => (
                      <tr key={index} className={batch.scannedQty > batch.expectedQty ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-sm">{batch.batch}</td>
                        <td className="px-3 py-2 text-sm">{batch.expectedQty}</td>
                        <td className="px-3 py-2 text-sm">{batch.scannedQty}</td>
                        <td className="px-3 py-2 text-sm">
                          {batch.scannedQty > batch.expectedQty ? (
                            <span className="text-red-600 font-medium">Exceeded</span>
                          ) : batch.scannedQty === batch.expectedQty ? (
                            <span className="text-green-600 font-medium">Complete</span>
                          ) : (
                            <span className="text-blue-600 font-medium">In Progress</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-600">
              This item has already reached its total expected quantity across all batches. Scanning more would exceed the required amount.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleQuantityExceedConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors duration-200 border border-gray-300"
              >
                Cancel Scan
              </button>
              <button
                onClick={() => handleQuantityExceedConfirm(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 font-medium"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <ManualMedicineAddForm
        medicines={availableMedicines}
        isVisible={showManualMedicineModal}
        setIsvisible={setShowManualMedicineModal}
      />

      {/* Completion Modal */}
      {showCompletionModal && (
        <CompletionModal
          selectedInvoice={selectedInvoice}
          scannedMedicines={scannedMedicines}
          onConfirm={handleConfirmCompletion}
          onCancel={() => setShowCompletionModal(false)}
        />
      )}

      {/* Workflow Status Banner */}
      <div className={`p-3 mx-6 mt-4 rounded border-l-4 ${workflowStatus === 'idle' ? 'bg-blue-50 border-blue-400' :
        workflowStatus === 'invoice_selected' ? 'bg-yellow-50 border-yellow-400' :
          workflowStatus === 'ready_to_scan' ? 'bg-green-50 border-green-400' :
            workflowStatus === 'scanning' ? 'bg-purple-50 border-purple-400' :
              'bg-gray-50 border-gray-400'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {workflowStatus === 'idle' && (
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              {workflowStatus === 'invoice_selected' && (
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              {workflowStatus === 'ready_to_scan' && (
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {workflowStatus === 'scanning' && (
                <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )}
              {workflowStatus === 'completed' && (
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                {workflowStatus === 'idle' && selectedInvoice
                  ? `Invoice ${selectedInvoice.InvoiceNo} loaded (${invItems.length} items). Ready for scanning.`
                  : workflowStatus === 'idle' && !selectedInvoice
                    ? 'Ready: Please select an invoice to start'
                    : workflowStatus === 'invoice_selected'
                      ? 'Loading: Invoice selected, preparing for scanning...'
                      : workflowStatus === 'ready_to_scan'
                        ? `Ready to Scan: ${invItems.length} items loaded (${availableMedicines.length} unscanned)`
                        : workflowStatus === 'scanning'
                          ? `Scanning: ${getUniqueScannedItems()} of ${invItems.length} items scanned (excluding ${scannedMedicines.filter(m => m.status === 'pending').length} pending)`
                          : workflowStatus === 'completed'
                            ? `Completed: ${getUniqueScannedItems()} of ${invItems.length} items scanned`
                            : 'Unknown status'}
              </p>
            </div>
          </div>

          {/* Add Medicine Button - Only show when invoice is selected */}
          {selectedInvoice && workflowStatus !== 'idle' && workflowStatus !== 'invoice_selected' && (
            <div className="flex items-center space-x-2">
              {workflowStatus === 'completed' && (
                <button
                  onClick={handleContinueScanning}
                  className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                >
                  Continue Scanning
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {lastError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-2 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <span className="font-medium">Error:</span> {lastError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Banner */}
      {!socketConnection && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-2 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">Connection Warning:</span> Scanner is disconnected. Please check your connection. Your data is saved and will be restored when reconnected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Component */}
      <Header
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        selectedInvoice={selectedInvoice}
        onInvoiceSelect={handleInvoiceSelect}
        setInvItems={setInvItems}
        scanningProgress={scanningProgress}
        onCompleteScanning={handleCompleteScanning}
        socketConnection={socketConnection}
        lastError={lastError}
        setlasterrror={setLastError}
        scannedMedicines={scannedMedicines}
        workflowStatus={workflowStatus}
        uniqueItemsCount={getUniqueScannedItems()}
        groupedMedicines={getGroupedMedicinesForHeader()}
        saveToLocalStorage={saveToLocalStorage}
        clearLocalStorage={clearLocalStorageManual}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Medicine List Panel - Main Content */}
        <div className="flex-1">
          <MedicineList
            selectedInvoice={selectedInvoice}
            scannedMedicines={scannedMedicines}
            onMedicineUpdate={handleMedicineUpdate}
            socketConnection={socketConnection}
            lastError={lastError}
            invItems={invItems}
            onVerificationComplete={handleVerificationComplete}
            workflowStatus={workflowStatus}
            uniqueItemsCount={getUniqueScannedItems()}
            checkManualQuantityAdjustment={checkManualQuantityAdjustment}
          />
        </div>
      </div>
    </div>
  );
}

export default CsvViewer;