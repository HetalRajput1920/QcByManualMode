import React, { useState } from 'react';
import axios from 'axios';
import MedicineLabelModal from './medHistoryModal';

function InvoiceModal({ isVisible, onClose, token }) {
  const [invoiceData, setInvoiceData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // State for medicine label modal
  const [isMedicineLabelVisible, setIsMedicineLabelVisible] = useState(false);
  const [selectedInvoiceParams, setSelectedInvoiceParams] = useState(null);

  // Function to fetch invoices
  const fetchInvoices = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return;
    }

    setIsLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);

      const response = await axios.get(
        `http://192.168.1.110:3500/api/warehouse/get-checker-history?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      console.log('Invoice data received:', response.data);
      setInvoiceData(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Failed to fetch invoices: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date range changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle view medicine label
  const handleViewMedicineLabel = (invoice) => {
    if (invoice) {
      // Format the date to DD-MM-YYYY
      const date = new Date(invoice.Vdt);
      const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');

      setSelectedInvoiceParams({
        InvoiceNo: invoice.InvoiceNo,
        Vdt: formattedDate,
        Acno: invoice.Acno
      });
      setIsMedicineLabelVisible(true);
    }
  };

  // Set default date range when modal opens - TODAY to TODAY
  React.useEffect(() => {
    if (isVisible) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      setDateRange({
        startDate: todayStr,
        endDate: todayStr
      });
      
      // Auto-fetch when modal opens with today's date
      setTimeout(() => fetchInvoices(), 0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Modal Header - Enhanced */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Invoice History</h3>
                <p className="text-sm text-gray-500 mt-1">View and manage invoice details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Date Range Filter - Enhanced */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Date Range Filter</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  START DATE
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  END DATE
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base font-medium"
                />
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={fetchInvoices}
                disabled={isLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-bold text-base shadow-sm"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Fetch Invoices'
                )}
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const todayStr = today.toISOString().split('T')[0];
                  setDateRange({
                    startDate: todayStr,
                    endDate: todayStr
                  });
                  setTimeout(() => fetchInvoices(), 0);
                }}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium text-base"
              >
                Reset to Today
              </button>
            </div>
          </div>

          {/* Invoices Table - Enhanced with larger text */}
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mb-4"></div>
                  <p className="text-lg text-gray-600 font-medium">Loading invoices...</p>
                </div>
              </div>
            ) : invoiceData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="bg-gray-100 p-8 rounded-2xl text-center">
                  <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-2xl font-bold text-gray-700 mb-2">No invoices found</p>
                  <p className="text-base text-gray-500">No invoices for {formatDate(dateRange.startDate)}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                  <h4 className="text-base font-extrabold text-gray-700 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Invoices for {formatDate(dateRange.startDate)}
                  </h4>
                  <div className="bg-green-100 px-4 py-2 rounded-lg">
                    <span className="text-sm font-extrabold text-green-700">Total: {invoiceData.length}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-green-100 to-green-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">#</th>
                          <th className="px-6 py-4 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Invoice No</th>
                          <th className="px-6 py-4 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Invoice Date</th>
                          <th className="px-6 py-4 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Account No</th>
                          <th className="px-6 py-4 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Customer Name</th>
                          <th className="px-6 py-4 text-left text-sm font-extrabold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoiceData.map((invoice, index) => (
                          <tr key={invoice.InvoiceNo || index} className="hover:bg-green-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-base font-extrabold text-gray-900 bg-green-100 px-3 py-1.5 rounded-lg">
                                {invoice.InvoiceNo}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-800">
                              {formatDate(invoice.Vdt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-800">
                              {invoice.Acno}
                            </td>
                            <td className="px-6 py-4 text-base font-semibold text-gray-900 max-w-md">
                              <div className="truncate" title={invoice.CustName}>
                                {invoice.CustName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleViewMedicineLabel(invoice)}
                                className="inline-flex items-center px-4 py-2.5 bg-amber-100 text-amber-800 rounded-xl hover:bg-amber-200 transition-colors font-bold text-sm shadow-sm border border-amber-200"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                View Label
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer - Enhanced */}
          <div className="border-t-2 border-gray-200 px-6 py-4 bg-gray-50 flex justify-end items-center">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 text-base rounded-xl hover:bg-gray-300 transition-colors font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Medicine Label Modal */}
      <MedicineLabelModal
        isVisible={isMedicineLabelVisible}
        onClose={() => setIsMedicineLabelVisible(false)}
        invoiceParams={selectedInvoiceParams}
        token={token}
      />
    </>
  );
}

export default InvoiceModal;