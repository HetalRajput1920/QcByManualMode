import React, { useState, useEffect } from 'react';

function ScannerPanel({ invItems, scannedMedicines, setScannedMedicines }) {
  console.log("Invoice Items:", invItems);
  console.log("Scanned Medicines:", scannedMedicines);

  const [lastScannedItem, setLastScannedItem] = useState(null);

  // Update last scanned item when new scans come in
  useEffect(() => {
    if (scannedMedicines && scannedMedicines.length > 0) {
      // Get the most recently scanned item (first item in the array)
      const mostRecentScan = scannedMedicines[0];
      if (mostRecentScan && mostRecentScan.code) {
        setLastScannedItem(mostRecentScan);
      }
    }
  }, [scannedMedicines]);

  // Calculate scanned quantity for each invoice item
  const getScannedQuantity = (item) => {
    if (!scannedMedicines || scannedMedicines.length === 0) return 0;
    
    const itemCode = item.Itemc || item.itemc || item.code;
    const batch = item.Batch || item.batch;
    
    const scannedItems = scannedMedicines.filter(med => 
      med.code.toString() === itemCode.toString() && 
      (med.batch === batch || med.actualBatch === batch)
    );
    
    if (scannedItems.length === 0) return 0;
    
    // Calculate total scanned quantity - count each scan as 1
    return scannedItems.length;
  };

  // Calculate total scanned quantity for item code across all batches
  const getTotalScannedForItemCode = (itemCode) => {
    if (!scannedMedicines || scannedMedicines.length === 0) return 0;
    
    const scannedItems = scannedMedicines.filter(med => 
      med.code.toString() === itemCode.toString()
    );
    
    // Count each scan as 1
    return scannedItems.length;
  };

  // Get status for each item - USING NewQty instead of Qty
  const getItemStatus = (item) => {
    const scannedQty = getScannedQuantity(item);
    const expectedQty = item.NewQty || 0; // Use NewQty instead of Qty
    
    if (scannedQty === 0) {
      return { status: 'pending', text: 'Pending', color: 'bg-gray-100 text-gray-800' };
    } else if (scannedQty < expectedQty) {
      return { status: 'scanned', text: 'Scanned', color: 'bg-blue-100 text-blue-800' };
    } else if (scannedQty === expectedQty) {
      return { status: 'complete', text: 'Complete', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'exceeded', text: 'Exceeded', color: 'bg-orange-100 text-orange-800' };
    }
  };

  // Check if item is the last scanned item
  const isLastScannedItem = (item) => {
    if (!lastScannedItem) return false;
    const itemCode = (item.Itemc || item.itemc || item.code).toString();
    const lastScannedCode = lastScannedItem.code.toString();
    return itemCode === lastScannedCode;
  };

  // Function to handle adding medicine to scanned list
  const handleAddMedicine = (item) => {
    if (!setScannedMedicines) {
      console.error('setScannedMedicines function is not available');
      return;
    }

    const itemCode = item.Itemc || item.itemc || item.code;
    const itemName = item.ItName || 'Unknown Medicine';
    const batch = item.Batch || item.batch;
    
    console.log('Adding medicine manually:', { itemCode, itemName, batch });

    // Create a new medicine object with 0 scanned quantity
    const newMedicine = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: itemName,
      code: itemCode,
      batch: batch,
      mrp: item.MRP || '',
      expiry: item.Expiry || '',
      pack: item.Pack || '',
      quantity: 0, // Start with 0 scanned quantity
      expectedQty: item.NewQty || 1,
      status: 'matched',
      timestamp: new Date().toLocaleTimeString(),
      scannedAt: new Date().toISOString(),
      isManualAdjustment: true,
      isManualEntry: true, // Flag to identify manually added medicines
      verifiedBy: 'Manual Entry',
      success: true,
      similarity: 1.0,
      mismatches: {},
      // Add required fields from the invoice item
      Vtype: item.Vtype || "SB",
      Vdt: item.Vdt || new Date().toISOString().split('T')[0],
      Vno: item.Vno || 0,
      Acno: item.Acno || 0,
      ItName: itemName,
      Pack: item.Pack || "",
      ItLocation: item.ItLocation || "MANUAL",
      Itemc: itemCode,
      Psrlno: item.Psrlno || 0,
      Batch: batch,
      Expiry: item.Expiry || "",
      MRP: parseFloat(item.MRP) || 0,
      Qty: parseFloat(item.Qty) || 0,
      TrayID: item.TrayID || 0,
      ItemSequence: item.ItemSequence || 0,
      PickerID: item.PickerID || 0,
      CheckerID: item.CheckerID || 0,
      NewPsrlno: item.NewPsrlno || 0,
      NewBatch: batch,
      NewQty: item.NewQty || 0,
      IsDelete: item.IsDelete || -1,
      Reason: item.Reason || null,
      Status: item.Status || "P",
      PickQty: item.PickQty || 0,
      PickTime: item.PickTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
      CheckTime: item.CheckTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
      PorderNo: item.PorderNo || 0
    };

    // Add the new medicine to the scanned medicines list at the top
    setScannedMedicines(prev => {
      const updated = [newMedicine, ...prev];
      console.log('✅ Medicine added manually with 0 quantity. Total scanned medicines:', updated.length);
      return updated;
    });

    // Show success feedback
    console.log('✅ Successfully added medicine to scanned list with 0 quantity:', itemName);
  };

  // Calculate how many items are pending (not yet scanned)
  const getPendingCount = () => {
    if (!invItems || invItems.length === 0) return 0;
    
    return invItems.filter(item => {
      const scannedQty = getScannedQuantity(item);
      return scannedQty === 0;
    }).length;
  };

  // Sort items: Last scanned item always on top, then by status, then by scanned quantity
  const sortedItems = [...(invItems || [])].sort((a, b) => {
    const aIsLastScanned = isLastScannedItem(a);
    const bIsLastScanned = isLastScannedItem(b);
    
    // First priority: Last scanned item ALWAYS comes to top
    if (aIsLastScanned && !bIsLastScanned) return -1;
    if (!aIsLastScanned && bIsLastScanned) return 1;
    
    // Second priority: Sort by status
    const aStatus = getItemStatus(a).status;
    const bStatus = getItemStatus(b).status;
    
    const statusPriority = {
      'exceeded': 4,
      'complete': 3,
      'scanned': 2,
      'pending': 1
    };
    
    if (statusPriority[aStatus] !== statusPriority[bStatus]) {
      return statusPriority[bStatus] - statusPriority[aStatus];
    }
    
    // Third priority: by scanned quantity (descending)
    const aScannedQty = getScannedQuantity(a);
    const bScannedQty = getScannedQuantity(b);
    if (aScannedQty !== bScannedQty) {
      return bScannedQty - aScannedQty;
    }
    
    // Finally by item code
    return (a.Itemc || a.itemc || a.code) - (b.Itemc || b.itemc || b.code);
  });

  return (  
    <div className="bg-white border-r border-gray-200 h-full flex flex-col w-80">
      {/* Header */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">INVOICE ITEMS</h2>
          <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded">
            {invItems?.length || 0} items
          </span>
        </div>
        <div className="mt-2 text-xs text-blue-600 text-center">
          All items are automatically added to scanned list when invoice is selected
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
            <span>Last Scanned</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            <span>Complete</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            <span>Scanned</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
            <span>Exceeded</span>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {sortedItems && sortedItems.length > 0 ? (
          <div>
            {sortedItems.map((item, index) => {
              const scannedQty = getScannedQuantity(item);
              const totalScannedForItemCode = getTotalScannedForItemCode(item.Itemc || item.itemc || item.code);
              const expectedQty = item.NewQty || 0; // Use NewQty instead of Qty
              const statusInfo = getItemStatus(item);
              const isLastScanned = isLastScannedItem(item);
              
              return (
                <div 
                  key={index}
                  className={`border-b border-gray-100 p-4 transition-all duration-300 ${
                    isLastScanned ? 'bg-yellow-50 border-l-4 border-l-yellow-400' :
                    statusInfo.status === 'complete' ? 'bg-green-50' :
                    statusInfo.status === 'scanned' ? 'bg-blue-50' :
                    statusInfo.status === 'exceeded' ? 'bg-orange-50' :
                    'hover:bg-gray-50'
                  }`}
                >
                  {/* Header with Status and Add Button */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 text-base leading-tight flex-1 mr-2">
                      {item.ItName || 'Unknown Medicine'}
                      {isLastScanned && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Last Scanned
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                      <button
                        onClick={() => handleAddMedicine(item)}
                        className="inline-flex items-center px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors duration-200"
                        title="Add this medicine to scanned list with 0 quantity"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Quantity Progress - USING NewQty/scannedQty */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Quantity:</span>
                      <span className={`font-semibold ${
                        scannedQty > expectedQty ? 'text-orange-600' :
                        scannedQty === expectedQty ? 'text-green-600' :
                        scannedQty > 0 ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {scannedQty} / {expectedQty}
                      </span>
                    </div>
                    {expectedQty > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            scannedQty > expectedQty ? 'bg-orange-500' :
                            scannedQty === expectedQty ? 'bg-green-500' :
                            scannedQty > 0 ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min((scannedQty / expectedQty) * 100, 100)}%` }}
                        ></div>
                      </div>
                    )}
                    {totalScannedForItemCode > scannedQty && (
                      <div className="text-xs text-gray-500 mt-1">
                        Total scanned (all batches): {totalScannedForItemCode}
                      </div>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {/* Batch */}
                    <div className="flex items-center">
                      <div className="bg-blue-50 p-2 rounded-lg mr-3 min-w-10">
                        <span className="text-xs font-medium text-blue-700">Batch</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{item.Batch || 'N/A'}</div>
                      </div>
                    </div>

                    {/* MRP */}
                    <div className="flex items-center">
                      <div className="bg-green-50 p-2 rounded-lg mr-3 min-w-10">
                        <span className="text-xs font-medium text-green-700">MRP</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{item.MRP ? `₹${item.MRP}` : 'N/A'}</div>
                      </div>
                    </div>

                    {/* Expiry */}
                    <div className="flex items-center">
                      <div className="bg-orange-50 p-2 rounded-lg mr-3 min-w-10">
                        <span className="text-xs font-medium text-orange-700">Exp</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{item.Expiry || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Pack */}
                    <div className="flex items-center">
                      <div className="bg-purple-50 p-2 rounded-lg mr-3 min-w-10">
                        <span className="text-xs font-medium text-purple-700">Pck</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{item.Pack || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
            <div className="bg-gray-100 p-4 rounded-full mb-3">
              <div className="text-lg font-medium text-gray-400">📦</div>
            </div>
            <p className="text-base font-medium text-gray-500 text-center">No medicines found</p>
            <p className="text-sm text-center mt-1 text-gray-400">Select an invoice to view items</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScannerPanel;