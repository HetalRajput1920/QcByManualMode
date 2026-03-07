import React, { useState } from 'react';
import axios from 'axios';

function MedicineLabelModal({ isVisible, onClose, invoiceParams, token }) {
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch invoice details with items
  const fetchInvoiceDetails = async () => {
    if (!invoiceParams || !invoiceParams.InvoiceNo) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `http://192.168.1.110:3500/api/warehouse/get-invoice-history`,
        invoiceParams,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Invoice details received:', response.data);
      
      // Set invoice header details
      setInvoiceDetails({
        InvoiceNo: response.data.InvoiceNo,
        Vdt: response.data.Vdt,
        Acno: response.data.Acno,
        CustName: response.data.CustName,
        Amt: response.data.Amt,
        NoofItem: response.data.NoofItem,
        Route: response.data.Route,
        Status: response.data.Status
      });
      
      // Set items array
      setItems(response.data.items || []);
      setSearchTerm(''); // Reset search when new invoice loads
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      setError('Failed to fetch invoice details: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when modal becomes visible
  React.useEffect(() => {
    if (isVisible && invoiceParams) {
      fetchInvoiceDetails();
    }
  }, [isVisible, invoiceParams]);

  // Toggle item expansion
  const toggleItemExpand = (index) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  // Filter items based on search term (item name or batch)
  const filteredItems = items.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (item.ItName && item.ItName.toLowerCase().includes(term)) ||
      (item.Batch && item.Batch.toLowerCase().includes(term))
    );
  });

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'P': return 'bg-green-100 text-green-800 border-green-200';
      case 'OnChecking': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'C': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] p-4">
      {/* Modal - Full size */}
      <div className="bg-white rounded-xl shadow-2xl w-[98vw] h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Header - Compact */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-amber-100 rounded-md flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Medicine Label</h3>
              <p className="text-xs text-gray-500">Invoice #{invoiceParams?.InvoiceNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center justify-center transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600 mb-4"></div>
              <p className="text-lg text-gray-600">Loading invoice details...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-red-50 p-6 rounded-xl text-center max-w-md">
              <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl font-medium text-red-800 mb-2">Error Loading Data</p>
              <p className="text-base text-red-600 mb-6">{error}</p>
              <button
                onClick={fetchInvoiceDetails}
                className="px-6 py-3 bg-red-600 text-white text-base rounded-lg hover:bg-red-700 transition-colors shadow"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Invoice Details Content */}
        {!isLoading && !error && invoiceDetails && (
          <>
            {/* Invoice Summary Cards - Ultra Compact (5% of modal) */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Invoice Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div className="bg-white p-2 rounded shadow-sm border-l-2 border-amber-500">
                  <p className="text-[10px] text-gray-500 mb-0.5">Inv No</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{invoiceDetails.InvoiceNo}</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm border-l-2 border-amber-500">
                  <p className="text-[10px] text-gray-500 mb-0.5">Date</p>
                  <p className="text-sm font-bold text-gray-900">{formatDate(invoiceDetails.Vdt)}</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm border-l-2 border-amber-500">
                  <p className="text-[10px] text-gray-500 mb-0.5">Ac No</p>
                  <p className="text-sm font-bold text-gray-900">{invoiceDetails.Acno}</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm border-l-2 border-amber-500">
                  <p className="text-[10px] text-gray-500 mb-0.5">Amount</p>
                  <p className="text-sm font-bold text-green-600 truncate">{formatCurrency(invoiceDetails.Amt)}</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm col-span-2">
                  <p className="text-[10px] text-gray-500 mb-0.5">Customer</p>
                  <p className="text-xs font-semibold text-gray-900 truncate">{invoiceDetails.CustName}</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm">
                  <p className="text-[10px] text-gray-500 mb-0.5">Items</p>
                  <p className="text-sm font-bold text-gray-900">{invoiceDetails.NoofItem}</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm">
                  <p className="text-[10px] text-gray-500 mb-0.5">Status</p>
                  <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusBadgeColor(invoiceDetails.Status)}`}>
                    {invoiceDetails.Status}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table - Takes 90% of modal space with search and filter */}
            <div className="flex-1 overflow-auto px-4 py-3 bg-gray-50" style={{ height: '90%' }}>
              {/* Search and header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                <h4 className="text-base font-bold text-gray-800 flex items-center">
                  <svg className="w-5 h-5 mr-1.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Medicine Items
                </h4>
                
                {/* Search input */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <input
                      type="text"
                      placeholder="Search by name or batch..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64 px-4 py-2 pl-9 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-medium"
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Clear search"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <div className="bg-amber-100 px-4 py-2 rounded-lg whitespace-nowrap">
                    <span className="text-sm font-bold text-amber-800">
                      {filteredItems.length} / {items.length}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Item Name</th>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Pack</th>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Batch</th>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Expiry</th>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">MRP</th>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-3 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <p className="text-base font-medium">No items match your search</p>
                              <button
                                onClick={() => setSearchTerm('')}
                                className="mt-2 text-sm text-amber-600 hover:text-amber-800 font-medium"
                              >
                                Clear search
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item, index) => (
                          <React.Fragment key={item.Psrlno || index}>
                            <tr className="hover:bg-amber-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-base font-bold text-gray-600">
                                {item.ItemSequence || index + 1}
                              </td>
                              <td className="px-4 py-3 text-base font-bold text-gray-900 max-w-[200px]">
                                <div className="font-extrabold">{item.ItName}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-base font-semibold text-gray-800">
                                {item.Pack}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-base font-bold font-mono bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full shadow-sm">
                                  {item.ItLocation}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-base font-extrabold font-mono text-gray-900">
                                {item.Batch}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-base font-bold bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full shadow-sm">
                                  {item.Expiry}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-base font-extrabold text-gray-900">
                                ₹{item.MRP?.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-xl font-black text-amber-600">{item.Qty}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <button
                                  onClick={() => toggleItemExpand(index)}
                                  className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-bold text-sm shadow-sm"
                                >
                                  {expandedItem === index ? 'Hide' : 'View'}
                                  <svg className={`w-4 h-4 ml-1.5 transition-transform ${expandedItem === index ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                            {expandedItem === index && (
                              <tr className="bg-amber-50">
                                <td colSpan="9" className="px-4 py-4">
                                  <div className="bg-white rounded-xl p-4 shadow-inner border-2 border-amber-200">
                                    <h5 className="text-base font-extrabold text-gray-800 mb-3">Additional Details</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">PSRL No</p>
                                        <p className="text-base font-extrabold font-mono text-gray-900">{item.Psrlno}</p>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Tray ID</p>
                                        <p className="text-base font-extrabold text-gray-900">{item.TrayID}</p>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Basket ID</p>
                                        <p className="text-base font-extrabold text-gray-900">{item.BasketID}</p>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Order No</p>
                                        <p className="text-base font-extrabold text-gray-900">{item.PorderNo}</p>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Item Code</p>
                                        <p className="text-base font-extrabold text-gray-900">{item.Itemc}</p>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Voucher Type</p>
                                        <p className="text-base font-extrabold text-gray-900">{item.Vtype}</p>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Checked By</p>
                                        <p className="text-base font-extrabold text-gray-900">{item.CheckedBy || 'N/A'}</p>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Stage</p>
                                        <p className="text-base font-extrabold text-gray-900">{item.Stage}</p>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Item Status</p>
                                        <span className={`inline-flex px-3 py-1.5 text-sm font-extrabold rounded-full ${getStatusBadgeColor(item.Status)}`}>
                                          {item.Status}
                                        </span>
                                      </div>
                                      <div className="bg-gray-100 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Pick Flag</p>
                                        <span className={`inline-flex px-3 py-1.5 text-sm font-extrabold rounded-full ${item.PickFlag ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {item.PickFlag ? 'Yes' : 'No'}
                                        </span>
                                      </div>
                                      {item.Reason && (
                                        <div className="col-span-2 bg-gray-100 p-3 rounded-lg">
                                          <p className="text-xs font-bold text-gray-500 mb-1">Reason</p>
                                          <p className="text-base font-extrabold text-gray-900">{item.Reason}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal Footer - Compact */}
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex justify-end items-center">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default MedicineLabelModal;