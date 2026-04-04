import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ManualMedicineAddForm from './addbatch';
import BatchDetailsModal from './BatchDetailsmodal';
import HistoryModal from './invHistoryModal'; // Import the HistoryModal component

function MedicineList({
  selectedInvoice,
  scannedMedicines,
  onMedicineUpdate,
  socketConnection,
  lastError,
  invItems,
  onVerificationComplete,
}) {
  console.log(">>>>>><<<<<<<<<  ", selectedInvoice);
  console.log("this is the scanned medicine data > ", scannedMedicines)
  const token = localStorage.getItem('token');

  // State for manual medicine modal
  const [showManualMedicineModal, setShowManualMedicineModal] = useState(false);
  const [selectedMedicineForManual, setSelectedMedicineForManual] = useState(null);

  // State for batch details modal
  const [showBatchDetailsModal, setShowBatchDetailsModal] = useState(false);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');

  // State for history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('code');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);
  const [isCompletingVerification, setIsCompletingVerification] = useState(false);
  const [selectedMedicineIndex, setSelectedMedicineIndex] = useState(0);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const listEndRef = useRef(null);
  const tableRef = useRef(null);
  const headerRef = useRef(null);

  // Refs for keyboard navigation
  const keyRepeatTimerRef = useRef(null);

  const filters = {
    all: 'All Items',
    matched: 'Matched',
    mismatched: 'Mismatched',
    notScanned: 'Not Scanned (Any Batch)'
  };

  // ============== FUNCTION DECLARATIONS (ORDER MATTERS) ==============

  // Function to format medicine data for the manual form
  const formatMedicineForManualForm = (medicine) => {
    // Get the item data from invItems if available
    const item = invItems?.find(invItem =>
      (invItem.Itemc || invItem.itemc || invItem.code) === (medicine.Itemc || medicine.code)
    ) || medicine;

    return {
      item_code: item.Itemc || item.itemc || item.code || medicine.Itemc || medicine.code || '',
      code: item.Itemc || item.itemc || item.code || medicine.Itemc || medicine.code || '',
      name: item.ItName || item.name || medicine.ItName || medicine.name || 'Unknown Medicine',
      ItName: item.ItName || item.name || medicine.ItName || medicine.name || 'Unknown Medicine',
      Mrp: item.MRP || item.mrp || medicine.MRP || medicine.mrp || 0,
      mrp: item.MRP || item.mrp || medicine.MRP || medicine.mrp || 0,
      Pack: item.Pack || item.pack || medicine.Pack || medicine.pack || '',
      pack: item.Pack || item.pack || medicine.Pack || medicine.pack || '',
      Expiry: item.Expiry || item.expiry || medicine.Expiry || medicine.expiry || '',
      expiry: item.Expiry || item.expiry || medicine.Expiry || medicine.expiry || '',
      Qty: item.Qty || medicine.Qty || 0,
      NewQty: item.NewQty || item.Qty || medicine.NewQty || medicine.Qty || 0,
      ItLocation: item.ItLocation || medicine.ItLocation || 'MANUAL',
      Batch: item.Batch || item.batch || medicine.Batch || medicine.batch || '',
      Psrlno: item.Psrlno || item.psrlno || medicine.Psrlno || medicine.psrlno || '',
      clqty: item.clqty || 0
    };
  };

  // Function to open manual form with selected medicine
  const handleOpenManualForm = (medicine) => {
    console.log('Opening manual form with medicine:', medicine);

    // Format the medicine data for the manual form
    const formattedMedicine = formatMedicineForManualForm(medicine);

    setSelectedMedicineForManual(formattedMedicine);
    setShowManualMedicineModal(true);
  };

  // Function to open batch details for a specific item code
  const handleOpenBatchDetails = (itemCode, itemName) => {
    setSelectedItemCode(itemCode);
    setSelectedItemName(itemName);
    setShowBatchDetailsModal(true);
  };

  // Function to open history modal
  const openHistoryModal = () => {
    setShowHistoryModal(true);
  };

  const getLiveBatchesForSelectedItem = () => {
    if (!selectedItemCode) return [];

    console.log('Getting batches for item:', selectedItemCode);
    console.log('Raw scannedMedicines:', scannedMedicines);
    console.log('InvItems:', invItems);

    const batchMap = new Map();

    // Calculate total expected quantity for this item from invoice
    let totalExpectedForItem = 0;
    if (invItems) {
      const invoiceItemsForCode = invItems.filter(inv => {
        const invCode = String(inv.Itemc || inv.code || '');
        return invCode === String(selectedItemCode);
      });

      totalExpectedForItem = invoiceItemsForCode.reduce((sum, inv) => {
        return sum + (inv.NewQty || inv.Qty || 0);
      }, 0);
    }

    // FIRST: Use raw scannedMedicines instead of medicinesArray
    const scannedItems = (scannedMedicines || []).filter(m => {
      const medicineCode = String(m.code || m.Itemc || '');
      const targetCode = String(selectedItemCode);
      return medicineCode === targetCode;
    });

    console.log('Found scanned items:', scannedItems.length);

    scannedItems.forEach(medicine => {
      // Get batch - try multiple possible field names
      const batchKey = medicine.actualBatch || medicine.batch || medicine.Batch || 'N/A';
      const psrlno = String(medicine.psrlno || medicine.Psrlno || 'N/A');
      const key = `${batchKey}_${psrlno}`;

      if (!batchMap.has(key)) {
        batchMap.set(key, {
          batch: batchKey,
          expiry: medicine.actualExpiry || medicine.expiry || medicine.Expiry || 'N/A',
          mrp: medicine.actualMrp || medicine.mrp || medicine.MRP || 0,
          scannedQty: medicine.scannedQty || medicine.quantity || 0,
          expectedQty: medicine.expectedQty || medicine.NewQty || medicine.Qty || 0,
          totalExpectedForItem: totalExpectedForItem, // Add total expected for item
          isMismatchBatch: medicine.isMismatchBatch || false,
          isMismatchExpiry: medicine.isMismatchExpiry || false,
          isMismatchMrp: medicine.isMismatchMrp || false,
          psrlno: psrlno,
          status: medicine.status || (medicine.scannedQty > 0 ? 'scanned' : 'pending'),
          pack: medicine.pack || medicine.Pack || '',
          type: 'scanned'
        });
      } else {
        const existing = batchMap.get(key);
        existing.scannedQty += (medicine.scannedQty || medicine.quantity || 0);
        existing.isMismatchBatch = existing.isMismatchBatch || medicine.isMismatchBatch;
        existing.isMismatchExpiry = existing.isMismatchExpiry || medicine.isMismatchExpiry;
        existing.isMismatchMrp = existing.isMismatchMrp || medicine.isMismatchMrp;
      }
    });

    // SECOND: Add expected batches from invoice items
    if (invItems) {
      const invoiceBatches = invItems.filter(inv => {
        const invCode = String(inv.Itemc || inv.code || '');
        const targetCode = String(selectedItemCode);
        return invCode === targetCode;
      });

      console.log('Found invoice batches:', invoiceBatches.length);

      invoiceBatches.forEach(inv => {
        const batchKey = inv.Batch || inv.batch || 'N/A';
        const psrlno = String(inv.Psrlno || inv.psrlno || 'N/A');
        const key = `${batchKey}_${psrlno}`;

        if (!batchMap.has(key)) {
          // This is an expected batch with no scans yet
          batchMap.set(key, {
            batch: batchKey,
            expiry: inv.Expiry || inv.expiry || 'N/A',
            mrp: inv.MRP || inv.mrp || 0,
            scannedQty: 0,
            expectedQty: inv.NewQty || inv.Qty || 0,
            totalExpectedForItem: totalExpectedForItem, // Add total expected for item
            isMismatchBatch: false,
            isMismatchExpiry: false,
            isMismatchMrp: false,
            psrlno: psrlno,
            status: 'not-scanned',
            pack: inv.Pack || inv.pack || '',
            type: 'expected',
            clqty: inv.clqty || 0,
            pickerName: inv.PickerName || ''
          });
        } else {
          // Batch exists (maybe from scans), update expected quantity
          const existing = batchMap.get(key);
          // Don't add, just ensure expectedQty matches invoice
          existing.expectedQty = Math.max(existing.expectedQty, inv.NewQty || inv.Qty || 0);
          existing.totalExpectedForItem = totalExpectedForItem; // Update total expected
        }
      });
    }

    // Convert to array - NO SORTING, preserve original order
    const batches = Array.from(batchMap.values());
    console.log('Final batches (no sorting):', batches);

    return batches;
  };

  // Handle quantity update from batch details modal
  const handleBatchQuantityUpdate = (itemCode, batch, psrlno, operation) => {
    console.log(`🔄 Batch quantity ${operation} for item: ${itemCode}, batch: ${batch}, psrlno: ${psrlno}`);

    // Get all batches for this item
    const currentBatches = getLiveBatchesForSelectedItem();

    // Calculate total scanned quantity for this item across ALL batches
    const totalScannedForItem = currentBatches.reduce((sum, b) => sum + (b.scannedQty || 0), 0);

    // Find the target batch
    const targetBatch = currentBatches.find(b =>
      b.batch === batch && String(b.psrlno) === String(psrlno)
    );

    if (!targetBatch) {
      console.warn(`⚠️ Batch not found for validation`);
      return;
    }

    let totalExpectedForItem = 0;

    // Find all invoice items with this item code
    if (invItems) {
      const invoiceItemsForCode = invItems.filter(inv => {
        const invCode = String(inv.Itemc || inv.code || '');
        return invCode === String(itemCode);
      });

      totalExpectedForItem = invoiceItemsForCode.reduce((sum, inv) => {
        return sum + (inv.NewQty || inv.Qty || 0);
      }, 0);
    }

    console.log(`Item ${itemCode} - Total Scanned: ${totalScannedForItem}, Total Expected: ${totalExpectedForItem}`);

    // For increase operation, check against total expected quantity
    if (operation === 'increase') {
      // Check if increasing would exceed the total expected quantity for this item
      if (totalScannedForItem >= totalExpectedForItem) {
        return;
      }
    }

    const updatedMedicines = [...(scannedMedicines || [])];

    const matchingMedicines = updatedMedicines.filter(m =>
      (m.code == itemCode || m.Itemc == itemCode) &&
      (m.batch == batch || m.actualBatch == batch) &&
      (m.psrlno == psrlno)
    );

    if (matchingMedicines.length > 0) {
      const medicineIndex = updatedMedicines.findIndex(m => m.id === matchingMedicines[0].id);
      const medicine = updatedMedicines[medicineIndex];
      const currentQty = medicine.scannedQty || 0;

      if (operation === 'increase') {
        // Double-check one more time before updating
        if (totalScannedForItem + 1 > totalExpectedForItem) {
          alert(`Cannot increase quantity. This would exceed the total expected quantity of ${totalExpectedForItem} for this item.`);
          return;
        }

        updatedMedicines[medicineIndex] = {
          ...medicine,
          scannedQty: currentQty + 1,
          quantity: currentQty + 1,
          isManualAdjustment: true,
          lastUpdated: new Date().toISOString()
        };
        console.log(`✅ Increased quantity for ${medicine.name} from ${currentQty} to ${currentQty + 1}`);
      } else if (operation === 'decrease' && currentQty > 0) {
        updatedMedicines[medicineIndex] = {
          ...medicine,
          scannedQty: currentQty - 1,
          quantity: currentQty - 1,
          isManualAdjustment: true,
          lastUpdated: new Date().toISOString()
        };
        console.log(`✅ Decreased quantity for ${medicine.name} from ${currentQty} to ${currentQty - 1}`);
      }

      onMedicineUpdate(updatedMedicines);
    } else {
      // If no matching medicine found, we need to create one
      console.log(`Creating new medicine entry for item: ${itemCode}, batch: ${batch}`);

      // Find the invoice item to get details
      const invoiceItem = invItems?.find(inv => {
        const invCode = String(inv.Itemc || inv.code || '');
        return invCode === String(itemCode);
      });

      if (invoiceItem) {
        const newMedicine = {
          id: `manual-${Date.now()}-${Math.random()}`,
          code: itemCode,
          Itemc: itemCode,
          name: invoiceItem.ItName || invoiceItem.name || selectedItemName,
          ItName: invoiceItem.ItName || invoiceItem.name || selectedItemName,
          batch: batch,
          actualBatch: batch,
          psrlno: psrlno,
          scannedQty: 1,
          quantity: 1,
          expectedQty: invoiceItem.NewQty || invoiceItem.Qty || 0,
          mrp: invoiceItem.MRP || 0,
          expiry: invoiceItem.Expiry || '',
          pack: invoiceItem.Pack || '',
          isManualAdjustment: true,
          lastUpdated: new Date().toISOString(),
          Vtype: invoiceItem.Vtype,
          Vdt: invoiceItem.Vdt,
          Vno: invoiceItem.Vno,
          Acno: invoiceItem.Acno,
          ItLocation: invoiceItem.ItLocation || '',
          clqty: invoiceItem.clqty || 0
        };

        updatedMedicines.push(newMedicine);
        onMedicineUpdate(updatedMedicines);
        console.log(`✅ Created new medicine entry with quantity 1`);
      }
    }
  };

  // Handle add new batch
  const handleAddBatch = (itemCode, itemName) => {
    console.log(`➕ Adding new batch for ${itemCode} - ${itemName}`);

    const existingMedicine = medicinesArray.find(m => m.code == itemCode || m.Itemc == itemCode);
    const invoiceItem = invItems?.find(inv => (inv.Itemc || inv.code) == itemCode);

    const medicineData = {
      code: itemCode,
      name: itemName || existingMedicine?.name || invoiceItem?.ItName,
      ItLocation: existingMedicine?.ItLocation || invoiceItem?.ItLocation || 'MANUAL',
      pack: existingMedicine?.pack || invoiceItem?.Pack || '',
      mrp: existingMedicine?.mrp || invoiceItem?.MRP || 0,
      clqty: invoiceItem?.clqty || 0
    };

    handleOpenManualForm(medicineData);
  };

  // Function to generate unique key
  const generateMedicineKey = (medicine, isForDisplay = false) => {
    if (!medicine) return 'invalid_medicine';

    const code = medicine?.code || medicine?.Itemc || medicine?.itemc || 'no-code';
    const batch = medicine?.batch || medicine?.Batch || medicine?.actualBatch || medicine?.NewBatch || 'no-batch';
    const psrlno = medicine?.psrlno || medicine?.Psrlno || 'no-psrlno';

    if (isForDisplay) {
      return `${code}_${batch}_${psrlno}`;
    }

    return `${code}_${batch}_${psrlno}`;
  };

  // Function to check if an invoice item is scanned (in any batch)
  const isInvoiceItemScanned = (invoiceItem) => {
    const itemCode = invoiceItem.Itemc || invoiceItem.itemc || invoiceItem.code;
    const itemPsrlno = invoiceItem.Psrlno || invoiceItem.psrlno;

    const isScanned = medicinesArray.some(medicine => {
      if (itemPsrlno && medicine.psrlno && medicine.psrlno.toString() === itemPsrlno.toString()) {
        return medicine.scannedQty > 0;
      }
      if (itemCode && medicine.code && medicine.code.toString() === itemCode.toString()) {
        return medicine.scannedQty > 0;
      }
      return false;
    });

    return isScanned;
  };

  // Get all invoice items that are NOT scanned (in any batch)
  const getNotScannedInvoiceItems = () => {
    if (!selectedInvoice || !invItems || invItems.length === 0) {
      return [];
    }

    return invItems.filter(invoiceItem => {
      return !isInvoiceItemScanned(invoiceItem);
    });
  };

  // Create display items for not scanned items
  const getNotScannedDisplayItems = () => {
    const notScannedItems = getNotScannedInvoiceItems();

    return notScannedItems.map((item, index) => ({
      id: `not-scanned-${index}-${Date.now()}`,
      name: item.ItName || item.name || 'N/A',
      code: item.Itemc || item.code || 'N/A',
      batch: item.Batch || item.batch || 'N/A',
      actualBatch: item.Batch || item.batch || 'N/A',
      expectedBatch: item.Batch || item.batch || 'N/A',
      psrlno: item.Psrlno || item.psrlno || 0,
      scannedQty: 0,
      expectedQty: item.NewQty || item.Qty || 0,
      status: 'not-scanned',
      isOverScanned: false,
      isMismatchBatch: false,
      isMismatchPack: false,
      isMismatchExpiry: false,
      isMismatchMrp: false,
      mrp: item.MRP || item.mrp || 0,
      expiry: item.Expiry || item.expiry || 'N/A',
      pack: item.Pack || item.pack || 'N/A',
      ItLocation: item.ItLocation || 'N/A',
      clqty: item.clqty || 0,
      uniqueKey: `not-scanned-${item.Psrlno || item.psrlno || item.Itemc || item.code}-${index}`,
      displayKey: `not-scanned-${item.Psrlno || item.psrlno || item.Itemc || item.code}-${index}`,
      Vtype: item.Vtype,
      Vdt: item.Vdt,
      Vno: item.Vno,
      Acno: item.Acno,
      ItName: item.ItName,
      Pack: item.Pack,
      Itemc: item.Itemc,
      Psrlno: item.Psrlno,
      Batch: item.Batch,
      Expiry: item.Expiry,
      MRP: item.MRP,
      Qty: item.Qty,
      NewQty: item.NewQty,
      PickerName: item.PickerName || '' // Add pickerName for not scanned items
    }));
  };

  // Group medicines by unique key
  const groupedMedicines = (scannedMedicines || []).reduce((acc, medicine) => {
    const key = generateMedicineKey(medicine);

    if (!acc[key]) {
      const scannedQtyValue = medicine.scannedQty !== undefined ? medicine.scannedQty :
        (medicine.quantity !== undefined ? medicine.quantity : 0);

      acc[key] = {
        ...medicine,
        id: medicine.id,
        expectedQty: medicine.NewQty || 1,
        scannedQty: scannedQtyValue,
        totalScans: 1,
        firstScanned: medicine.timestamp || medicine.scannedAt,
        lastScanned: medicine.timestamp || medicine.scannedAt,
        scanIds: [medicine.id],
        isOverScanned: false,
        isMismatchBatch: medicine.isMismatchBatch || false,
        isMismatchPack: medicine.isMismatchPack || false,
        isMismatchExpiry: medicine.isMismatchExpiry || false,
        isMismatchMrp: medicine.isMismatchMrp || false,
        actualBatch: medicine.actualBatch || medicine.batch,
        expectedBatch: medicine.expectedBatch || medicine.batch,
        actualPack: medicine.actualPack || medicine.pack,
        expectedPack: medicine.expectedPack || medicine.pack,
        actualExpiry: medicine.actualExpiry || medicine.expiry,
        expectedExpiry: medicine.expectedExpiry || medicine.expiry,
        actualMrp: medicine.actualMrp || medicine.mrp,
        expectedMrp: medicine.expectedMrp || medicine.mrp,
        status: medicine.status,
        Vtype: medicine.Vtype,
        Vdt: medicine.Vdt,
        Vno: medicine.Vno,
        Acno: medicine.Acno,
        ItName: medicine.ItName || medicine.name,
        Pack: medicine.Pack || medicine.pack,
        ItLocation: medicine.ItLocation,
        Itemc: medicine.Itemc || medicine.code,
        Psrlno: medicine.psrlno,
        Batch: medicine.Batch || medicine.batch,
        Expiry: medicine.Expiry || medicine.expiry,
        MRP: medicine.MRP || medicine.mrp,
        Qty: medicine.Qty || medicine.quantity,
        NewQty: medicine.NewQty || medicine.scannedQty || 1,
        IsDelete: medicine.IsDelete,
        Reason: medicine.Reason,
        Status: medicine.Status,
        TrayID: medicine.TrayID,
        ItemSequence: medicine.ItemSequence,
        PickerID: medicine.PickerID || 0,
        CheckerID: medicine.CheckerID || 0,
        PickQty: medicine.PickQty,
        PickTime: medicine.PickTime,
        CheckTime: medicine.CheckTime,
        PorderNo: medicine.PorderNo,
        clqty: medicine.clqty || 0,
        PickerName: medicine.PickerName || '' // Add pickerName for scanned medicines
      };
    } else {
      const scannedQtyToAdd = medicine.scannedQty !== undefined ? medicine.scannedQty :
        (medicine.quantity !== undefined ? medicine.quantity : 0);

      const totalScansToAdd = scannedQtyToAdd > 0 ? 1 : 0;

      acc[key] = {
        ...acc[key],
        id: acc[key].id,
        scannedQty: acc[key].scannedQty + scannedQtyToAdd,
        totalScans: acc[key].totalScans + totalScansToAdd,
        lastScanned: medicine.timestamp || medicine.scannedAt,
        scanIds: [...acc[key].scanIds, medicine.id],
        isMismatchBatch: medicine.isMismatchBatch || acc[key].isMismatchBatch,
        isMismatchPack: medicine.isMismatchPack || acc[key].isMismatchPack,
        isMismatchExpiry: medicine.isMismatchExpiry || acc[key].isMismatchExpiry,
        isMismatchMrp: medicine.isMismatchMrp || acc[key].isMismatchMrp,
        actualBatch: medicine.actualBatch || acc[key].actualBatch,
        actualPack: medicine.actualPack || acc[key].actualPack,
        actualExpiry: medicine.actualExpiry || acc[key].actualExpiry,
        actualMrp: medicine.actualMrp || acc[key].actualMrp
      };
    }

    return acc;
  }, {});

  // Convert grouped medicines to array and calculate over-scanned status
  const medicinesArray = Object.values(groupedMedicines).map(medicine => {
    let invoiceItem = null;
    let expectedQty = 0;

    if (medicine.psrlno && medicine.batch) {
      const invoiceItemsByBatchPsrlno = (invItems || []).filter(item => {
        const psrlnoFromInvoice = item.Psrlno || item.psrlno;
        const batchFromInvoice = item.Batch || item.batch;

        return psrlnoFromInvoice?.toString() === medicine.psrlno?.toString() &&
          batchFromInvoice?.toString() === medicine.batch?.toString();
      });

      if (invoiceItemsByBatchPsrlno.length > 0) {
        invoiceItem = invoiceItemsByBatchPsrlno[0];
        expectedQty = invoiceItem.NewQty || invoiceItem.Qty || 0;
      }
    }

    if (!invoiceItem && medicine.psrlno) {
      const invoiceItemsByPsrlno = (invItems || []).filter(item => {
        const psrlnoFromInvoice = item.Psrlno || item.psrlno;
        return psrlnoFromInvoice?.toString() === medicine.psrlno?.toString();
      });

      if (invoiceItemsByPsrlno.length > 0) {
        invoiceItem = invoiceItemsByPsrlno[0];
        expectedQty = invoiceItem.NewQty || invoiceItem.Qty || 0;
      }
    }

    if (!invoiceItem && medicine.psrlno && medicine.actualBatch && medicine.actualBatch !== medicine.batch) {
      const invoiceItemsByActualBatchPsrlno = (invItems || []).filter(item => {
        const psrlnoFromInvoice = item.Psrlno || item.psrlno;
        const batchFromInvoice = item.Batch || item.batch;

        return psrlnoFromInvoice?.toString() === medicine.psrlno?.toString() &&
          batchFromInvoice?.toString() === medicine.actualBatch?.toString();
      });

      if (invoiceItemsByActualBatchPsrlno.length > 0) {
        invoiceItem = invoiceItemsByActualBatchPsrlno[0];
        expectedQty = invoiceItem.NewQty || invoiceItem.Qty || 0;
      }
    }

    if (!invoiceItem && medicine.code && medicine.batch) {
      const invoiceItemsByCodeBatch = (invItems || []).filter(item => {
        const itemCodeFromInvoice = item.Itemc || item.itemc || item.code;
        const batchFromInvoice = item.Batch || item.batch;

        return itemCodeFromInvoice?.toString() === medicine.code?.toString() &&
          batchFromInvoice?.toString() === medicine.batch?.toString();
      });

      if (invoiceItemsByCodeBatch.length > 0) {
        invoiceItem = invoiceItemsByCodeBatch[0];
        expectedQty = invoiceItem.NewQty || invoiceItem.Qty || 0;
      }
    }

    if (!invoiceItem) {
      expectedQty = medicine.expectedQty || 0;
    }

    const isOverScanned = medicine.scannedQty > expectedQty;

    return {
      ...medicine,
      uniqueKey: generateMedicineKey(medicine),
      displayKey: generateMedicineKey(medicine, true),
      isOverScanned: isOverScanned,
      expectedQty: expectedQty,
      scannedQty: medicine.scannedQty || 0,
      invoiceMatchFound: !!invoiceItem,
      invoicePsrlno: invoiceItem?.Psrlno,
      invoiceBatch: invoiceItem?.Batch,
      invoiceNewQty: invoiceItem?.NewQty,
      invoiceQty: invoiceItem?.Qty,
      clqty: invoiceItem?.clqty || medicine.clqty || 0,
      pickerName: invoiceItem?.PickerName || medicine.PickerName || '' // Add pickerName from invoice or medicine
    };
  });

  // Check conditions for showing the button
  const shouldShowCompleteButton = selectedInvoice && medicinesArray.length > 0;

  // ============== FIXED GROUPING FUNCTION - NO SORTING ==============
  const getItemCodeGroupedList = () => {
    const itemCodeMap = new Map();
    const rawMedicines = scannedMedicines || [];

    // Create invoice lookup by item code to find ALL invoices for that item
    const invoicesByItemCode = new Map();
    if (invItems) {
      invItems.forEach(inv => {
        const itemCode = String(inv.Itemc || inv.code || '');
        if (!itemCode) return;

        if (!invoicesByItemCode.has(itemCode)) {
          invoicesByItemCode.set(itemCode, []);
        }
        invoicesByItemCode.get(itemCode).push(inv);
      });
    }

    // Create invoice lookup by psrlno for batch-specific matching
    const invoiceByPsrlno = new Map();
    if (invItems) {
      invItems.forEach(inv => {
        const psrlno = inv.Psrlno || inv.psrlno;
        if (psrlno) {
          invoiceByPsrlno.set(String(psrlno), inv);
        }
      });
    }

    // Process each scanned medicine - maintain original order
    rawMedicines.forEach(medicine => {
      const itemCode = String(medicine.code || medicine.Itemc || '');
      if (!itemCode) return;

      const psrlno = String(medicine.psrlno || medicine.Psrlno || '');

      // Find ALL matching invoice items for this item code
      const matchingInvoices = invoicesByItemCode.get(itemCode) || [];

      // Get or create item entry
      if (!itemCodeMap.has(itemCode)) {
        // Use the first matching invoice for item details
        const firstInvoice = matchingInvoices[0] || {};

        // Calculate total expected quantity for this item
        const itemExpectedQty = matchingInvoices.reduce((sum, inv) => {
          return sum + (inv.NewQty || inv.Qty || 0);
        }, 0);

        itemCodeMap.set(itemCode, {
          code: itemCode,
          name: medicine.ItName || medicine.name || firstInvoice?.ItName || 'Unknown',
          location: medicine.ItLocation || firstInvoice?.ItLocation || 'N/A',
          clqty: firstInvoice?.clqty || 0,
          pack: medicine.Pack || medicine.pack || firstInvoice?.Pack || 'N/A',
          expiry: medicine.Expiry || medicine.expiry || firstInvoice?.Expiry || 'N/A',
          mrp: medicine.MRP || medicine.mrp || firstInvoice?.MRP || 0,
          scannedQty: 0,
          expectedQty: itemExpectedQty,
          hasMismatch: false,
          batches: [],
          processedPsrlno: new Set(),
          pickerName: firstInvoice?.PickerName || medicine.PickerName || '' // Add pickerName at item level
        });
      }

      const item = itemCodeMap.get(itemCode);

      // Find matching invoice for this specific scan (by psrlno if available)
      const matchingInvoice = psrlno ? invoiceByPsrlno.get(psrlno) : null;

      // Determine display batch (show actual for mismatched, expected for matched)
      const displayBatch = medicine.isMismatchBatch ?
        (medicine.actualBatch || medicine.batch) :
        (medicine.batch || medicine.Batch || 'N/A');

      // Create a unique key using BOTH batch AND psrlno
      const batchKey = `${displayBatch}_${psrlno}`;

      // Find or create batch using the composite key
      let batch = item.batches.find(b => b.batchKey === batchKey);

      if (!batch) {
        batch = {
          batchKey: batchKey,
          batch: displayBatch,
          expiry: medicine.isMismatchExpiry ? medicine.actualExpiry : (medicine.expiry || medicine.Expiry || 'N/A'),
          mrp: medicine.isMismatchMrp ? medicine.actualMrp : (medicine.mrp || medicine.MRP || 0),
          scannedQty: 0,
          expectedQty: matchingInvoice?.NewQty || matchingInvoice?.Qty || 0,
          isMismatchBatch: medicine.isMismatchBatch || false,
          isMismatchExpiry: medicine.isMismatchExpiry || false,
          isMismatchMrp: medicine.isMismatchMrp || false,
          psrlno: psrlno,
          status: medicine.status || 'pending',
          pickerName: matchingInvoice?.PickerName || medicine.PickerName || item.pickerName || '' // Add pickerName at batch level
        };
        item.batches.push(batch);
      }

      // Update batch quantities
      const scanQty = medicine.scannedQty || medicine.quantity || 0;
      batch.scannedQty += scanQty;

      // Update batch mismatch flags
      batch.isMismatchBatch = batch.isMismatchBatch || (medicine.isMismatchBatch || false);
      batch.isMismatchExpiry = batch.isMismatchExpiry || (medicine.isMismatchExpiry || false);
      batch.isMismatchMrp = batch.isMismatchMrp || (medicine.isMismatchMrp || false);

      // Mark psrlno as processed
      if (psrlno) {
        item.processedPsrlno.add(psrlno);
      }
    });

    // Add not scanned items
    const notScannedItems = getNotScannedDisplayItems();
    notScannedItems.forEach(item => {
      const itemCode = String(item.code);
      const psrlno = String(item.psrlno || '');

      if (!itemCodeMap.has(itemCode)) {
        itemCodeMap.set(itemCode, {
          code: itemCode,
          name: item.name,
          location: item.ItLocation || 'N/A',
          clqty: item.clqty || 0,
          pack: item.pack || 'N/A',
          expiry: item.expiry || 'N/A',
          mrp: item.mrp || 0,
          scannedQty: 0,
          expectedQty: 0,
          hasMismatch: false,
          batches: [],
          processedPsrlno: new Set(),
          pickerName: item.PickerName || '' // Add pickerName for not scanned items
        });
      }

      const existingItem = itemCodeMap.get(itemCode);

      // Only add if psrlno not processed
      if (!existingItem.processedPsrlno.has(psrlno)) {
        // Use batch + psrlno composite key for not-scanned items too
        const batchKey = `${item.batch}_${psrlno}`;
        const batch = existingItem.batches.find(b => b.batchKey === batchKey);

        if (batch) {
          // Add to existing batch's expected quantity
          batch.expectedQty += (item.expectedQty || 0);
        } else {
          // Create new not-scanned batch with composite key
          existingItem.batches.push({
            batchKey: batchKey,
            batch: item.batch,
            expiry: item.expiry,
            mrp: item.mrp,
            scannedQty: 0,
            expectedQty: item.expectedQty || 0,
            isMismatchBatch: false,
            isMismatchExpiry: false,
            isMismatchMrp: false,
            psrlno: psrlno,
            status: 'not-scanned',
            pickerName: item.PickerName || existingItem.pickerName || '' // Add pickerName for not scanned batches
          });
        }

        existingItem.processedPsrlno.add(psrlno);
      }
    });

    // Calculate totals and prepare final array - NO SORTING, preserve insertion order
    const result = Array.from(itemCodeMap.values()).map(item => {
      // Calculate totals
      item.scannedQty = item.batches.reduce((sum, b) => sum + (b.scannedQty || 0), 0);
      item.expectedQty = item.batches.reduce((sum, b) => sum + (b.expectedQty || 0), 0);
      item.hasMismatch = item.batches.some(b =>
        b.isMismatchBatch || b.isMismatchExpiry || b.isMismatchMrp
      );

      // Get the first available pickerName from batches or keep existing
      const firstBatchWithPicker = item.batches.find(b => b.pickerName);
      if (firstBatchWithPicker && !item.pickerName) {
        item.pickerName = firstBatchWithPicker.pickerName;
      }

      // NO SORTING - keep batches in original order
      // Simply return item with batches as they were added

      return item;
    });

    return result;
  };

  // Calculate statistics
  const calculateStats = () => {
    const notScannedItems = getNotScannedInvoiceItems();
    const itemCodeList = getItemCodeGroupedList();

    // Calculate items with scanned quantity > 0
    const itemsWithScans = itemCodeList.filter(item => item.scannedQty > 0).length;

    return {
      total: (scannedMedicines || []).length,
      unique: selectedInvoice?.NumberOfitem || 0,
      pending: medicinesArray.filter(m => m.status === 'pending').length,
      matched: medicinesArray.filter(m => m.status === 'matched').length,
      mismatched: medicinesArray.filter(m => m.status === 'mismatched').length,
      notScanned: notScannedItems.length,
      totalExpectedQty: medicinesArray.reduce((sum, med) => sum + (med.expectedQty || 1), 0),
      totalScannedQty: medicinesArray.reduce((sum, med) => sum + (med.scannedQty || 1), 0),
      overScanned: medicinesArray.filter(m => m.isOverScanned).length,
      batchMismatches: medicinesArray.filter(m => m.isMismatchBatch).length,
      packMismatches: medicinesArray.filter(m => m.isMismatchPack).length,
      expiryMismatches: medicinesArray.filter(m => m.isMismatchExpiry).length,
      mrpMismatches: medicinesArray.filter(m => m.isMismatchMrp).length,
      uniqueItems: itemCodeList.length,
      itemsWithScans: itemsWithScans  // New stat for items with any scan
    };
  };

  const stats = calculateStats();

  // Function to check if verification can be completed
  const canCompleteVerification = () => {
    if (!selectedInvoice || medicinesArray.length === 0) {
      return false;
    }

    const itemCodeList = getItemCodeGroupedList();

    // Check if at least one item has been scanned
    const hasAtLeastOneScan = itemCodeList.some(item => item.scannedQty > 0);

    // Also check for over-scanned items (optional - you can remove this condition)
    const hasOverScannedItems = itemCodeList.some(item => item.scannedQty > item.expectedQty);

    // Log the reasons for debugging
    if (!hasAtLeastOneScan) {
      console.log('❌ Cannot complete verification: No items have been scanned yet');
    }
    if (hasOverScannedItems) {
      console.log('❌ Cannot complete verification: Has over-scanned items');
    }

    // Allow completion if:
    // 1. At least one item has been scanned
    // 2. No over-scanned items (optional - remove if you want to allow overscan)
    const canComplete = hasAtLeastOneScan && !hasOverScannedItems;

    console.log(`Verification can be completed: ${canComplete} (Has scan: ${hasAtLeastOneScan}, No overscan: ${!hasOverScannedItems})`);

    return canComplete;
  };

  // Get the main display list (grouped by item code) - NO SORTING APPLIED
  const itemCodeList = getItemCodeGroupedList();

  // Filter and sort the main list - FILTERING ONLY, NO SORTING
  const getFilteredList = () => {
    let filtered = itemCodeList;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchLower) ||
        item.code?.toLowerCase().includes(searchLower) ||
        item.pickerName?.toLowerCase().includes(searchLower) // Add pickerName to search
      );
    }

    if (filter !== 'all' && filter !== 'notScanned') {
      filtered = filtered.filter(item => {
        if (filter === 'matched') return !item.hasMismatch;
        if (filter === 'mismatched') return item.hasMismatch;
        return true;
      });
    } else if (filter === 'notScanned') {
      filtered = filtered.filter(item => item.scannedQty === 0);
    }

    // NO SORTING - preserve original order from getItemCodeGroupedList()
    // Filtered list maintains the order from the original data

    return filtered;
  };

  const displayList = getFilteredList();

  // Auto-scroll to selected medicine
  useEffect(() => {
    if (tableRef.current && displayList[selectedMedicineIndex]) {
      const selectedRow = tableRef.current.querySelector(`[data-index="${selectedMedicineIndex}"]`);
      if (selectedRow) {
        setTimeout(() => {
          selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }, 10);
      }
    }
  }, [selectedMedicineIndex, displayList]);

  // Progress Circle Component
  const ProgressCircle = ({ scanned, expected }) => {
    const percentage = expected > 0 ? Math.min((scanned / expected) * 100, 100) : 0;
    const size = 40;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let color = 'text-gray-400';
    if (scanned > expected) color = 'text-orange-500';
    else if (scanned === expected) color = 'text-green-500';
    else if (scanned > 0) color = 'text-red-500';

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={color}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <span className="absolute text-xs font-bold" style={{ fontSize: '10px' }}>
          {Math.round(percentage)}%
        </span>
      </div>
    );
  };

  // Overall Progress Bar Component
  const OverallProgressBar = ({ scannedItems, totalItems }) => {
    const percentage = totalItems > 0 ? (scannedItems / totalItems) * 100 : 0;

    return (
      <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-700">Overall Progress:</span>
          <span className="text-lg font-bold text-blue-600">{scannedItems}</span>
          <span className="text-gray-400">/</span>
          <span className="text-lg font-bold text-gray-900">{totalItems}</span>
          <span className="text-sm text-gray-500 ml-1">items</span>
        </div>
        <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-300 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-blue-600 min-w-[45px]">
          {Math.round(percentage)}%
        </span>
      </div>
    );
  };

  const getQuantityColor = (scanned, expected) => {
    if (scanned > expected) return 'text-orange-600 font-bold';
    if (scanned === expected) return 'text-green-600 font-bold';
    if (scanned < expected) return 'text-blue-600 font-bold';
    return 'text-gray-900';
  };

  const getRowBackgroundColor = (index) => {
    return index === selectedMedicineIndex ? 'bg-blue-200 border-l-4 border-l-blue-900' : 'hover:bg-gray-50';
  };

  const hasMismatch = (item) => {
    return item.batches?.some(b => b.isMismatchBatch || b.isMismatchExpiry || b.isMismatchMrp);
  };

  // Function to delete a specific medicine entry completely
  const confirmDelete = () => {
    if (medicineToDelete) {
      const scanIdsToRemove = medicineToDelete.scanIds || [];
      const updatedMedicines = (scannedMedicines || []).filter(
        med => !scanIdsToRemove.includes(med.id)
      );
      onMedicineUpdate(updatedMedicines);
    }
    setShowDeleteConfirm(false);
    setMedicineToDelete(null);
  };

  // Function to cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setMedicineToDelete(null);
  };

  // Function to show complete verification confirmation
  const showCompleteVerificationConfirm = () => setShowCompleteConfirm(true);
  const cancelCompleteVerification = () => setShowCompleteConfirm(false);
  const proceedWithVerification = () => {
    setShowCompleteConfirm(false);
    handleCompleteVerification();
  };

  // API Payload preparation
  const prepareVerificationPayload = () => {
    if (!selectedInvoice || medicinesArray.length === 0) return [];

    const itemCodesWithDelete9 = new Set();
    medicinesArray.forEach(medicine => {
      const requiresIsDelete9 = medicine.isMismatchBatch || medicine.isMismatchPack ||
        medicine.isMismatchExpiry || medicine.isMismatchMrp ||
        medicine.scannedQty !== medicine.expectedQty;
      if (requiresIsDelete9) {
        const itemCode = medicine.Itemc || medicine.code || "";
        if (itemCode) itemCodesWithDelete9.add(itemCode);
      }
    });

    return medicinesArray.map(medicine => {
      const requiresIsDelete9 = medicine.isMismatchBatch || medicine.isMismatchPack ||
        medicine.isMismatchExpiry || medicine.isMismatchMrp ||
        medicine.scannedQty !== medicine.expectedQty;
      const itemCode = medicine.Itemc || medicine.code || "";
      const shouldBeDelete9 = requiresIsDelete9 || itemCodesWithDelete9.has(itemCode);

      const basePayload = {
        Vtype: medicine.Vtype || "SB",
        Vdt: medicine.Vdt ? new Date(medicine.Vdt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        Vno: medicine.Vno || selectedInvoice.InvoiceNo || 0,
        Acno: medicine.Acno || 0,
        ItName: medicine.name || "",
        Pack: medicine.Pack || "",
        ItLocation: medicine.ItLocation || "",
        Itemc: itemCode,
        Psrlno: medicine.psrlno || 0,
        Batch: medicine.Batch || "",
        Expiry: medicine.Expiry || "",
        MRP: parseFloat(medicine.MRP) || 0,
        Qty: parseFloat(medicine.Qty) || 0,
        TrayID: medicine.TrayID || 0,
        ItemSequence: medicine.ItemSequence || 0,
        PickerID: medicine.PickerID || 0,
        CheckerID: medicine.CheckerID || 0,
        NewPsrlno: medicine.psrlno || 0,
        NewBatch: medicine.NewBatch || "",
        NewQty: parseFloat(medicine.NewQty) || 0,
        IsDelete: shouldBeDelete9 ? 9 : 8,
        Reason: medicine.Reason || " ",
        Status: "C",
        PickQty: parseFloat(medicine.PickQty) || 0,
        PickTime: medicine.PickTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
        CheckTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
        PorderNo: medicine.PorderNo || 0,
        clqty: medicine.clqty || 0,
        PickerName: medicine.PickerName || "" // Add PickerName to payload
      };

      if (basePayload.IsDelete === 8) basePayload.NewBatch = `# ${medicine.actualBatch}`;
      if (medicine.isMismatchBatch) {
        basePayload.NewBatch = medicine.actualBatch;
        basePayload.Reason = "New Batch Inserted";
        basePayload.Batch = medicine.actualBatch;
        basePayload.Qty = 0;
      }
      if (basePayload.Qty !== medicine.scannedQty && medicine.scannedQty > 0 && !medicine.isMismatchBatch) {
        basePayload.Reason = 'Qty Change';
        basePayload.NewBatch = `# ${medicine.actualBatch}`;
        basePayload.IsDelete = 9;
      }
      if (medicine.scannedQty === 0) basePayload.Reason = 'Batch Delete';
      if (medicine.isMismatchPack) basePayload.Pack = medicine.actualPack || medicine.pack;
      if (medicine.isMismatchExpiry) basePayload.Expiry = medicine.actualExpiry || medicine.expiry;
      if (medicine.isMismatchMrp) basePayload.MRP = parseFloat(medicine.actualMrp) || parseFloat(medicine.mrp) || 0;
      basePayload.NewQty = medicine.scannedQty;

      return basePayload;
    });
  };

  const prepareReleaseBasketPayload = () => {
    if (!selectedInvoice) return null;

    const formatDate = (dateString) => {
      if (!dateString) return new Date().toISOString().split('T')[0];
      try {
        if (typeof dateString === 'string') {
          if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
            const [day, month, year] = dateString.split('-');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) return dateString;
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Date formatting error:', error);
      }
      return new Date().toISOString().split('T')[0];
    };

    return {
      Vdt: formatDate(selectedInvoice.Vdt),
      Acno: selectedInvoice.Acno || 0,
      CustName: selectedInvoice.CustName || selectedInvoice.customerName || "",
      InvoiceNo: selectedInvoice.InvoiceNo || selectedInvoice.invoiceNumber?.replace('INV-', '') || 0,
      Amt: selectedInvoice.Amt || selectedInvoice.amount || 0,
      Address: selectedInvoice.Address || "",
      PersonalMsg: selectedInvoice.PersonalMsg || "",
      NoOfItem: selectedInvoice.NoOfItem || selectedInvoice.totalItems || 0,
      Route: selectedInvoice.Route || "",
      Generated_By: selectedInvoice.Generated_By || "MASTER",
      Basket: selectedInvoice.Basket || selectedInvoice.basketNumber || "",
      Flag: selectedInvoice.Flag || false,
      Status: selectedInvoice.Status
    };
  };

  const releaseBasket = async () => {
    try {
      const payload = prepareReleaseBasketPayload();
      if (!payload) {
        console.error('❌ No basket data available for release');
        alert('No basket data available for release');
        return false;
      }

      console.log('🚀 Releasing basket with payload:', payload);
      const response = await axios.post(
        'http://192.168.1.110:3500/api/warehouse/release-basket',
        payload,
        {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          timeout: 30000
        }
      );

      console.log('✅ Basket released successfully. Response:', response.data);
      if (response.data.success === false || response.data.error) {
        console.warn('Basket release warning:', response.data.message || response.data.error);
        return true;
      }
      return true;

    } catch (error) {
      console.error('❌ Error releasing basket:', error);
      let errorMessage = 'Failed to release basket';
      if (error.response) {
        if (error.response.status === 401) errorMessage = 'Authentication failed. Please login again.';
        else if (error.response.status === 404) errorMessage = 'Basket release endpoint not found.';
        else if (error.response.data?.message) errorMessage = error.response.data.message;
        else errorMessage = `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Check network connection.';
      } else {
        errorMessage = error.message;
      }
      alert(`❌ ${errorMessage}`);
      return false;
    }
  };

  const handleCompleteVerification = async () => {
    if (!selectedInvoice) {
      alert('Please select an invoice first');
      return;
    }
    if (medicinesArray.length === 0) {
      alert('No scanned medicines to verify');
      return;
    }

    setIsCompletingVerification(true);

    try {
      console.log('=== STARTING VERIFICATION PROCESS ===');
      console.log('STEP 1: Inserting QC data...');
      const payload = prepareVerificationPayload();
      console.log('Payload for QC data:', JSON.stringify(payload, null, 2));

      const verificationResponse = await axios.post(
        'http://192.168.1.110:3000/api/ocr/insert-qc-data',
        payload,
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
      );

      console.log("✅ Step 1 - QC data inserted. Status:", verificationResponse.status);
      const verificationResult = verificationResponse.data;

      console.log('STEP 2: Releasing basket...');
      const basketReleased = await releaseBasket();

      if (basketReleased) console.log('✅ Step 2 - Basket released successfully');
      else console.warn('⚠️ Basket release failed, but QC data was inserted');

      if (onVerificationComplete) onVerificationComplete(verificationResult, basketReleased);

      const successMessage = `✅ Verification completed successfully!\n\n${basketReleased ? '✓ Basket released successfully' : '⚠ Basket release failed'}`;
      alert(successMessage);
      onMedicineUpdate([]);

    } catch (error) {
      console.error('❌ Error completing verification:', error);
      if (error.response?.data?.message?.includes('QC data already exists')) {
        alert(`⚠️ QC data already exists for this Vno and Itemc\n\nPlease verify if this item has already been checked.`);
      } else if (error.response?.data) {
        alert(`Failed to complete verification: ${JSON.stringify(error.response.data)}`);
      } else {
        alert(`Failed to complete verification: ${error.message}`);
      }
    } finally {
      setIsCompletingVerification(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showDeleteConfirm || showCompleteConfirm || showManualMedicineModal || showBatchDetailsModal || showHistoryModal) {
        handlePopupKeyDown(event);
        return;
      }
      if (!displayList.length) return;
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedMedicineIndex(prev => prev < displayList.length - 1 ? prev + 1 : prev);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedMedicineIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A') return;
          event.preventDefault();
          if (displayList[selectedMedicineIndex]) {
            const selectedItem = displayList[selectedMedicineIndex];
            handleOpenBatchDetails(selectedItem.code, selectedItem.name);
          }
          break;
        case 'End':
          event.preventDefault();
          if (shouldShowCompleteButton && canCompleteVerification()) setShowCompleteConfirm(true);

          break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (keyRepeatTimerRef.current) clearTimeout(keyRepeatTimerRef.current);
    };
  }, [displayList, selectedMedicineIndex, showDeleteConfirm, showCompleteConfirm, showManualMedicineModal, showBatchDetailsModal, showHistoryModal, shouldShowCompleteButton]);

  const handlePopupKeyDown = (event) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        if (showDeleteConfirm) cancelDelete();
        else if (showCompleteConfirm) cancelCompleteVerification();
        else if (showManualMedicineModal) {
          setShowManualMedicineModal(false);
          setSelectedMedicineForManual(null);
        } else if (showBatchDetailsModal) {
          setShowBatchDetailsModal(false);
          setSelectedItemCode('');
          setSelectedItemName('');
        } else if (showHistoryModal) {
          setShowHistoryModal(false);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (showDeleteConfirm) confirmDelete();
        else if (showCompleteConfirm) proceedWithVerification();
        break;
      default: break;
    }
  };

  // Get live batches for the modal (recalculates on every render)
  const liveBatches = getLiveBatchesForSelectedItem();

  return (
    <>
      {/* Manual Medicine Add Form Modal */}
      {selectedMedicineForManual && (
        <ManualMedicineAddForm
          medicines={[selectedMedicineForManual]}
          isVisible={showManualMedicineModal}
          setIsvisible={setShowManualMedicineModal}
        />
      )}

      {/* Batch Details Modal */}
      <BatchDetailsModal
        isVisible={showBatchDetailsModal}
        onClose={() => {
          setShowBatchDetailsModal(false);
          setSelectedItemCode('');
          setSelectedItemName('');
        }}
        itemCode={selectedItemCode}
        itemName={selectedItemName}
        batches={liveBatches}
        onUpdateQuantity={handleBatchQuantityUpdate}
        onAddBatch={handleAddBatch}
        key={selectedItemCode}
      />

      {/* History Modal */}
      <HistoryModal
        isVisible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        token={token}
      />

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 h-full flex flex-col" style={{ minWidth: '1200px' }}>

        {/* Complete Verification Confirmation Modal */}
        {showCompleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-green-600">Complete Verification</h3>
              <p className="mb-4 text-gray-600">Are you sure you want to complete the verification process?</p>
              <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
                <p className="font-medium text-gray-900">Verification Summary</p>
                <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-2">
                  <div>Total Items: <span className="font-bold">{stats.uniqueItems}</span></div>
                  <div>Items with Scans: <span className="font-bold text-blue-600">{stats.itemsWithScans}</span></div>
                  <div>Matched: <span className="font-bold text-green-600">{stats.matched}</span></div>
                  <div>Mismatched: <span className="font-bold text-red-600">{stats.mismatched}</span></div>
                  <div>Not Scanned: <span className="font-bold text-gray-600">{stats.notScanned}</span></div>
                  <div>Over Scanned: <span className="font-bold text-orange-600">{stats.overScanned}</span></div>
                  <div>Batch Issues: <span className="font-bold text-purple-600">{stats.batchMismatches}</span></div>
                </div>
              </div>
              <p className="mb-4 text-sm text-green-600 font-medium">This will submit all verification data and release the basket.</p>
              <div className="flex justify-end space-x-3">
                <button onClick={cancelCompleteVerification} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel (Esc)</button>
                <button onClick={proceedWithVerification} disabled={isCompletingVerification}
                  className={`px-4 py-2 rounded font-medium ${isCompletingVerification ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}>
                  {isCompletingVerification ? 'Processing...' : 'Complete (Enter)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Header Section */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedInvoice ? `Invoice: ${selectedInvoice.InvoiceNo}` : 'Medicine Verification'}
            </h2>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${socketConnection ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={socketConnection ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {socketConnection ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="pl-4 pr-4 pb-4 flex space-x-3">
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-base font-medium"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-base font-medium bg-white"
            >
              {Object.entries(filters).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {selectedInvoice && (
              <div>
                <OverallProgressBar
                  scannedItems={stats.itemsWithScans}
                  totalItems={stats.uniqueItems}
                />
              </div>
            )}

            <div className="flex space-x-2">
              {/* History Button */}
              <button
                onClick={openHistoryModal}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-base font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>History</span>
              </button>

              {shouldShowCompleteButton && (
                <button
                  onClick={showCompleteVerificationConfirm}
                  disabled={!canCompleteVerification() || isCompletingVerification}
                  className={`px-6 py-3 rounded-lg text-base font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 ${!canCompleteVerification() || isCompletingVerification
                    ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  title={!canCompleteVerification() ? "Complete verification when all items are scanned and no overscan exists" : ""}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete Verification</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Table with Sticky Header */}
        <div className="flex-1 overflow-auto bg-white" ref={tableRef}>
          {!selectedInvoice ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-xl font-medium">Select an invoice</p>
              <p className="text-base">Choose an invoice to start verification</p>
            </div>
          ) : displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="text-4xl mb-4">📱</div>
              <p className="text-xl font-medium">
                {filter === 'notScanned' ? 'All items scanned' : 'No items found'}
              </p>
              <p className="text-base">
                {socketConnection ? 'Start scanning from mobile' : 'Waiting for connection'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-purple-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Loc</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">CL Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Pack</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">MRP</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Picker</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Scanned</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayList.map((item, index) => (
                  <tr
                    key={item.code}
                    data-index={index}
                    onClick={() => setSelectedMedicineIndex(index)}
                    className={`cursor-pointer transition-colors duration-200 ${getRowBackgroundColor(index)}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">{item.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-bold text-gray-900 max-w-xs truncate" title={item.name}>
                        {item.name}
                        {item.hasMismatch && (
                          <span className="ml-2 px-2 py-1 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">Mismatch</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">{item.clqty || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">{item.pack}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">{item.expiry}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-900">₹{typeof item.mrp === 'number' ? item.mrp.toFixed(2) : item.mrp}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-blue-600" title={item.pickerName}>{item.pickerName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ProgressCircle scanned={item.scannedQty} expected={item.expectedQty} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className={`text-lg font-bold ${getQuantityColor(item.scannedQty, item.expectedQty)}`}>
                          {item.scannedQty}
                        </div>
                        <span className="text-gray-400 text-lg">/</span>
                        <div className="text-lg font-bold text-gray-900">{item.expectedQty}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div ref={listEndRef} />
        </div>

        {/* Footer with summary */}
        {selectedInvoice && displayList.length > 0 && (
          <div className="border-t-2 border-gray-200 bg-gray-100 px-6 py-4">
            <div className="flex justify-between items-center">
              {displayList[selectedMedicineIndex] && (
                <div className="text-sm bg-white px-4 py-2 rounded-lg shadow-sm">
                  <span className="font-semibold text-blue-600">🎯 Selected:</span>
                  <span className="ml-2 font-medium">{displayList[selectedMedicineIndex].name}</span>
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="font-bold text-green-600">{displayList[selectedMedicineIndex].scannedQty}/{displayList[selectedMedicineIndex].expectedQty}</span>
                  <span className="ml-3 text-gray-500 text-xs">[{selectedMedicineIndex + 1} of {displayList.length}]</span>
                  <span className="ml-3 text-green-600 text-xs font-semibold">Enter: View Batch Details</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default MedicineList;