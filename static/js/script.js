// Global variables
let selectedFile = null;
window.thubTgsComparisonData = null;
window.thubTotalsData = null;
window.allTHubData = null;
window.allTGDetailedData = [];

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectedFileDiv = document.getElementById('selectedFile');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFile');
const processBtn = document.getElementById('processBtn');
const fileReadyMsg = document.getElementById('fileReadyMsg');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const downloadBtn = document.getElementById('downloadBtn');
const alert = document.getElementById('alert');
const alertMessage = document.getElementById('alertMessage');
const alertClose = document.getElementById('alertClose');
const metadataInfo = document.getElementById('metadataInfo');
const fromDateValue = document.getElementById('fromDateValue');
const toDateValue = document.getElementById('toDateValue');
const financialYearInfo = document.getElementById('financialYearInfo');
const financialYearValue = document.getElementById('financialYearValue');

// Format currency with commas
function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Show alert
function showAlert(message, type = 'error') {
    alert.className = `alert ${type}`;
    alertMessage.textContent = message;
    alert.style.display = 'flex';
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// Close alert
alertClose.addEventListener('click', () => {
    alert.style.display = 'none';
});

// Upload area click
uploadArea.addEventListener('click', (e) => {
    // Don't trigger if clicking on the browse button label
    if (e.target.closest('label') || e.target.closest('input')) {
        return;
    }
    fileInput.click();
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// File input change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Handle file selection (without auto-processing)
function handleFileSelect(file) {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
        showAlert('Please select an Excel file (.xlsx or .xls)');
        return;
    }

    if (file.size > 16 * 1024 * 1024) {
        showAlert('File size must be less than 16MB');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    uploadArea.style.display = 'none';
    selectedFileDiv.style.display = 'flex';
    fileReadyMsg.style.display = 'block';
    
    // Enable the Generate button
    processBtn.disabled = false;
}

// Remove file
removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    uploadArea.style.display = 'block';
    selectedFileDiv.style.display = 'none';
    fileReadyMsg.style.display = 'none';
    resultsSection.style.display = 'none';
    progressContainer.style.display = 'none';
    processBtn.disabled = true;
});

// Generate button click
processBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showAlert('Please select a file first');
        return;
    }
    
    // Disable button during processing
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    await processFile();
    
    // Re-enable button after processing
    processBtn.disabled = false;
    processBtn.innerHTML = '<i class="fas fa-cogs"></i> Generate Report';
});

// Process file
async function processFile() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading file...';

    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) {
            progressFill.style.width = progress + '%';
        }
    }, 200);

    try {
        console.log('=== Uploading file to /process ===');
        const response = await fetch('/process', {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);
        progressFill.style.width = '100%';

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Processing failed');
        }

        const data = await response.json();
        console.log('Server response received:', data);
        
        if (data.success) {
            progressText.textContent = 'Processing complete!';
            showAlert('File processed successfully!', 'success');
            
            console.log('Calling displayResults with preview data');
            // Display results and set default view to Document View
            displayResults(data.preview);
            resultsSection.style.display = 'block';
            
            // Set Document View as default
            const viewToggle = document.getElementById('viewToggle');
            if (viewToggle) {
                viewToggle.style.display = 'flex';
                const documentViewBtn = viewToggle.querySelector('[data-view="document"]');
                if (documentViewBtn) {
                    documentViewBtn.click();
                }
            }
            
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 1000);
        }
    } catch (error) {
        clearInterval(progressInterval);
        progressContainer.style.display = 'none';
        showAlert(error.message || 'An error occurred while processing the file');
        
        // Don't reset file on error, allow user to try again
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-cogs"></i> Generate Report';
    }
}

// Store TG Summary data globally for download
let currentTGSummaryData = [];
let allTGDetailedData = []; // Store all TG detailed data for combined download
let allTHubData = []; // Store all T-Hub data for combined download
let allTGDetailedDataNonRecurring = []; // Store all TG non-recurring detailed data
let allTHubDataNonRecurring = []; // Store all T-Hub non-recurring data
let allComparisonTableData = []; // Store T-Hub & TGs Comparison table data
let allComparisonTableDataNonRecurring = []; // Store T-Hub & TGs Comparison table data for non-recurring
let allThubSummaryData = []; // Store T-Hub-Wise summary data
let allThubSummaryDataNonRecurring = []; // Store T-Hub-Wise summary data for non-recurring

// Download TG Summary Table as CSV
function downloadTGSummary(data) {
    if (!data || data.length === 0) {
        showAlert('No data available to download', 'error');
        return;
    }
    
    // Create CSV content
    const headers = ['TG', 'Recurring - Expenditure Limit', 'Recurring - Expenditure Spent', 'Recurring - Balance', 'Non-Recurring - Expenditure Limit', 'Non-Recurring - Expenditure Spent', 'Non-Recurring - Balance'];
    
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) value = '';
            // Escape quotes and wrap in quotes if needed
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'TG_Wise_Exp_Rec_vs_Non_Rec.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('TG Summary downloaded successfully!', 'success');
}

// Download T-Hub Summary
function downloadTHubSummary(data) {
    if (!data) {
        showAlert('No data available to download', 'error');
        return;
    }
    
    // Create CSV content
    const headers = ['Sanctioned Head', 'Total Funds Released', 'Total Expenditure', 'Balance'];
    
    let csv = headers.join(',') + '\n';
    
    // Add Recurring row
    const recurringRow = [
        'Recurring',
        data.total_funds_released || 0,
        data.total_expenditure || 0,
        data.balance || 0
    ];
    csv += recurringRow.join(',') + '\n';
    
    // Add Total row
    const totalRow = [
        'Total',
        data.total_funds_released || 0,
        data.total_expenditure || 0,
        data.balance || 0
    ];
    csv += totalRow.join(',') + '\n';
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'T-Hub_Wise_Expenditure_Summary.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('T-Hub Summary downloaded successfully!', 'success');
}

// Add download button event listener
document.addEventListener('DOMContentLoaded', () => {
    const downloadTGSummaryBtn = document.getElementById('downloadTGSummaryBtn');
    if (downloadTGSummaryBtn) {
        downloadTGSummaryBtn.addEventListener('click', () => {
            downloadTGSummary(currentTGSummaryData);
        });
    }
    
    const downloadAllTGTablesBtn = document.getElementById('downloadAllTGTablesBtn');
    if (downloadAllTGTablesBtn) {
        downloadAllTGTablesBtn.addEventListener('click', () => {
            downloadAllTGTables();
        });
    }
    
    const downloadTHubTotalsBtn = document.getElementById('downloadTHubTotalsBtn');
    if (downloadTHubTotalsBtn) {
        downloadTHubTotalsBtn.addEventListener('click', () => {
            showTHubTotalsFormatDialog();
        });
    }
    
    const downloadAllTHubTablesBtn = document.getElementById('downloadAllTHubTablesBtn');
    if (downloadAllTHubTablesBtn) {
        downloadAllTHubTablesBtn.addEventListener('click', () => {
            downloadAllTHubTables();
        });
    }

    
    const downloadTHubSummaryBtn = document.getElementById('downloadTHubSummaryBtn');
    if (downloadTHubSummaryBtn) {
        downloadTHubSummaryBtn.addEventListener('click', () => {
            downloadTHubSummary(window.thubTotalsData);
        });
    }
    
    const downloadThubTgsComparisonBtn = document.getElementById('downloadThubTgsComparisonBtn');
    if (downloadThubTgsComparisonBtn) {
        downloadThubTgsComparisonBtn.addEventListener('click', () => {
            showThubTgsComparisonFormatDialog();
        });
    }
});

// Display results in tables
function displayResults(preview) {
    console.log('=== displayResults called ===');
    console.log('preview object:', preview);
    
    // Display metadata if available
    let hasMetadata = false;
    
    // Display From Date and To Date
    if (preview.from_date || preview.to_date) {
        if (preview.from_date) {
            fromDateValue.textContent = preview.from_date;
        }
        if (preview.to_date) {
            toDateValue.textContent = preview.to_date;
        }
        hasMetadata = true;
    }
    
    // Display Financial Year if available
    if (preview.financial_year) {
        financialYearValue.textContent = preview.financial_year;
        financialYearInfo.style.display = 'block';
        hasMetadata = true;
    } else {
        financialYearInfo.style.display = 'none';
    }
    
    // Show metadata section if there's any metadata
    if (hasMetadata) {
        metadataInfo.style.display = 'block';
    } else {
        metadataInfo.style.display = 'none';
    }

    // Recurring summary table
    createTable('recurringTable', preview.recurring_summary, [
        'Grant Type', 'Total_Expenditure_Limit', 
        'Total_Expenditure_Spent', 'Total_Balance'
    ]);

    // Institute split table - with explicit column order
    createTable('splitTable', preview.institute_split, [
        'TG', 'Child Agency Name',
        'Recurring - Expenditure Limit', 'Recurring - Expenditure Spent', 'Recurring - Balance',
        'Non-Recurring - Expenditure Limit', 'Non-Recurring - Expenditure Spent', 'Non-Recurring - Balance'
    ]);

    // TG Summary table - with explicit column order
    if (preview.tg_summary_table && preview.tg_summary_table.length > 0) {
        currentTGSummaryData = preview.tg_summary_table;
        const tgSummaryColumns = [
            'TG',
            'Recurring - Expenditure Limit',
            'Recurring - Expenditure Spent',
            'Recurring - Balance',
            'Non-Recurring - Expenditure Limit',
            'Non-Recurring - Expenditure Spent',
            'Non-Recurring - Balance'
        ];
        createTable('tgSummaryTable', preview.tg_summary_table, tgSummaryColumns);
        
        // Also populate the Excel View TG Summary table
        createTable('tgSummaryTableExcel', preview.tg_summary_table, tgSummaryColumns);
        
        // Display T-Hub & TGs comparison table for RECURRING
        displayTHubTgsComparison(preview.tg_summary_table, preview.thub_summary, preview.to_date);
        
        // Display TG detailed tables for RECURRING
        displayTGDetailedTables(preview.tg_summary_table, preview.to_date);
        
        // Display T-Hub & TGs comparison table for NON-RECURRING
        displayTHubTgsComparisonNonRecurring(preview.tg_summary_table, preview.thub_summary, preview.to_date);
        
        // Display TG detailed tables for NON-RECURRING
        displayTGDetailedTablesNonRecurring(preview.tg_summary_table, preview.to_date);
    }

    // T-Hub table
    if (preview.thub_summary && preview.thub_summary.length > 0) {
        allTHubData = preview.thub_summary.map(row => ({
            hub: row['Hub'],
            sanction_number: row['Assignment Sanction Number'],
            grant_type: row['Grant Type'],
            total_funds_released: row['Expenditure_Limit'],
            total_expenditure: row['Expenditure_Spent'],
            balance: row['Balance'],
            toDate: preview.to_date
        }));
    }
    createTable('thubTable', preview.thub_summary, [
        'Hub', 'Assignment Sanction Number', 'Grant Type',
        'Expenditure_Limit', 'Expenditure_Spent', 'Balance'
    ]);

    // T-Hub Totals table (displayed above TG tables)
    if (preview.thub_totals) {
        displayTHubTotalsTable(preview.thub_totals, preview.to_date);
        // Also display Non-Recurring T-Hub Totals - pass thub_summary array instead
        displayTHubTotalsTableNonRecurring(preview.thub_summary, preview.to_date);
    }

    // Display TG-Wise data - removed as TG-Wise Exp Rec tab is no longer used
    // if (preview.tg_wise_summary && Object.keys(preview.tg_wise_summary).length > 0) {
    //     displayTGWiseSummary(preview.tg_wise_summary, preview.to_date);
    // }
    
    // Display UC data if available
    if (preview.uc_data) {
        console.log('UC data available in preview, calling populateUCData');
        populateUCData(preview.uc_data);
    } else {
        console.log('No UC data in preview');
    }
    
    console.log('=== displayResults completed ===');
}

// Populate UC table with extracted data
function populateUCData(ucData) {
    try {
        console.log('=== populateUCData called ===');
        console.log('ucData input:', ucData);
        console.log('ucData type:', typeof ucData);
        
        // Determine if ucData is organized by type (recurring/non-recurring) or a simple array
        let recurringData = [];
        let nonRecurringData = [];
        
        if (ucData && typeof ucData === 'object' && !Array.isArray(ucData)) {
            // New format: {recurring: [...], non_recurring: [...]}
            recurringData = ucData.recurring || [];
            nonRecurringData = ucData.non_recurring || [];
            console.log(`Data organized by type - Recurring: ${recurringData.length}, Non-Recurring: ${nonRecurringData.length}`);
        } else if (Array.isArray(ucData)) {
            // Old format: simple array
            recurringData = ucData;
            console.log(`Simple array format with ${recurringData.length} entries`);
        }
        
        // Find Recurring table by ID
        const recurringTableBody = document.querySelector('table.uc-template-table:not(#ucNonRecurringTable) tbody');
        if (recurringTableBody) {
            console.log(`Populating Recurring table with ${recurringData.length} entries`);
            populateTableData(recurringTableBody, recurringData, 'Recurring');
        } else {
            console.warn('Recurring table body not found');
        }
        
        // Find Non-Recurring table by ID
        const nonRecurringTableBody = document.getElementById('ucNonRecurringTableBody');
        if (nonRecurringTableBody) {
            console.log(`Populating Non-Recurring table with ${nonRecurringData.length} entries`);
            populateTableData(nonRecurringTableBody, nonRecurringData, 'Non-Recurring');
        } else {
            console.warn('Non-Recurring table body not found');
        }
        
        const totalCount = recurringData.length + nonRecurringData.length;
        if (totalCount > 0) {
            showAlert(`${recurringData.length} Recurring and ${nonRecurringData.length} Non-Recurring UC data entries populated`, 'success');
        }
        console.log('=== populateUCData completed successfully ===');
    } catch (error) {
        console.error('Error populating UC data:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Helper function to populate a table with data
function populateTableData(tbody, dataList, tableType) {
    try {
        console.log(`populateTableData called for ${tableType} with ${dataList.length} entries`);
        
        // Clear existing rows
        tbody.innerHTML = '';
        console.log(`Cleared ${tableType} table rows`);
        
        // Calculate total amount from all rows
        const totalAmount = dataList.reduce((sum, data) => {
            return sum + (parseFloat(data.amount) || 0);
        }, 0);
        console.log(`Total Amount sum: ${totalAmount}`);
        
        // Calculate total expenditure from SC Exp table (Total Expenditure (III) column)
        let totalExpenditureFromSC = 0;
        const lowerTableType = tableType.toLowerCase();
        
        if (lowerTableType.includes('recurring') && !lowerTableType.includes('non')) {
            // Recurring
            const scTable = document.getElementById('thubTgsComparisonTable');
            if (scTable) {
                const tbody_sc = scTable.querySelector('tbody');
                if (tbody_sc) {
                    const rows_sc = tbody_sc.querySelectorAll('tr');
                    console.log(`Found ${rows_sc.length} rows in SC Recurring table`);
                    rows_sc.forEach((row, idx) => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length > 2) {
                            // Column 3 (index 2) is "Total Expenditure (III)"
                            const expenditureText = cells[2].textContent.trim();
                            // Remove commas and other formatting, keep only digits and decimal point
                            const cleanText = expenditureText.replace(/[^0-9.]/g, '');
                            const expenditure = parseFloat(cleanText) || 0;
                            totalExpenditureFromSC += expenditure;
                            console.log(`  SC Row ${idx + 1} Expenditure: "${expenditureText}" => ${expenditure}`);
                        }
                    });
                }
            }
        } else if (lowerTableType.includes('non')) {
            // Non-Recurring
            const scTable = document.getElementById('thubTgsComparisonTableNonRecurring');
            if (scTable) {
                const tbody_sc = scTable.querySelector('tbody');
                if (tbody_sc) {
                    const rows_sc = tbody_sc.querySelectorAll('tr');
                    console.log(`Found ${rows_sc.length} rows in SC Non-Recurring table`);
                    rows_sc.forEach((row, idx) => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length > 2) {
                            // Column 3 (index 2) is "Total Expenditure (III)"
                            const expenditureText = cells[2].textContent.trim();
                            // Remove commas and other formatting, keep only digits and decimal point
                            const cleanText = expenditureText.replace(/[^0-9.]/g, '');
                            const expenditure = parseFloat(cleanText) || 0;
                            totalExpenditureFromSC += expenditure;
                            console.log(`  SC Row ${idx + 1} Expenditure: "${expenditureText}" => ${expenditure}`);
                        }
                    });
                }
            }
        }
        console.log(`Total Expenditure from SC (${lowerTableType}): ${totalExpenditureFromSC}`);
        
        // Calculate expenditure half once to use consistently in all cells
        const expenditureHalf = totalExpenditureFromSC / 2;
        console.log(`Expenditure Half (for all tables): ${expenditureHalf}`);
        
        // Create rows for each data entry
        dataList.forEach((data, rowIndex) => {
            console.log(`Creating ${tableType} row ${rowIndex + 1}:`, data);
            
            const newRow = document.createElement('tr');
            
            // Create 9 cells: 0-2 empty, 3-5 Grant received, 6-8 separate vertical cells
            for (let j = 0; j < 9; j++) {
                const td = document.createElement('td');
                
                if (j === 3) {
                    // Column 3: "Sanction No. (I)"
                    td.textContent = data.sanction_number || '';
                    console.log(`  Cell ${j} (Sanction No.): "${td.textContent}"`);
                } else if (j === 4) {
                    // Column 4: "Date (ii)"
                    td.textContent = '';
                    console.log(`  Cell ${j} (Date): ""`);
                } else if (j === 5) {
                    // Column 5: "Amount (iii)"
                    td.classList.add('vertical-cell');
                    td.textContent = data.amount ? formatCurrency(data.amount) : '';
                    console.log(`  Cell ${j} (Amount - vertical): "${td.textContent}"`);
                } else if (j === 6) {
                    // Column 6: "Total Available funds" - Show total in first row, empty in others
                    td.classList.add('vertical-cell');
                    if (rowIndex === 0) {
                        td.textContent = formatCurrency(totalAmount);
                        console.log(`  Cell ${j} (Total Available funds - sum): "${td.textContent}"`);
                    } else {
                        td.textContent = '';
                        console.log(`  Cell ${j} (Total Available funds - empty): ""`);
                    }
                } else if (j === 7) {
                    // Column 7: "Expenditure incurred" - Show total from SC divided by 2 in first row, empty in others
                    td.classList.add('vertical-cell');
                    if (rowIndex === 0) {
                        td.textContent = formatCurrency(expenditureHalf);
                        console.log(`  Cell ${j} (Expenditure - sum from SC / 2): "${td.textContent}"`);
                    } else {
                        td.textContent = '';
                        console.log(`  Cell ${j} (Expenditure - empty): ""`);
                    }
                } else if (j === 8) {
                    // Column 8: "Closing Balances (5-6)" - Calculate: Total Available funds - Expenditure incurred
                    td.classList.add('vertical-cell');
                    if (rowIndex === 0) {
                        const closingBalance = Math.abs(totalAmount - expenditureHalf);
                        td.textContent = formatCurrency(closingBalance);
                        console.log(`  Cell ${j} (Closing Balance): ${totalAmount} - ${expenditureHalf} = ${closingBalance}`);
                    } else {
                        td.textContent = '';
                        console.log(`  Cell ${j} (Closing Balance - empty): ""`);
                    }
                } else {
                    // Other columns (0-2): empty
                    td.textContent = '';
                }
                
                newRow.appendChild(td);
            }
            
            tbody.appendChild(newRow);
            console.log(`${tableType} row ${rowIndex + 1} appended`);
        });
        
        console.log(`Final ${tableType} tbody has ${tbody.querySelectorAll('tr').length} rows`);
        
        // Also populate Component wise utilization table with the same expenditure value
        if (dataList.length > 0) {
            console.log(`Populating component table with expenditureHalf: ${expenditureHalf}`);
            
            // Use different component table IDs for Recurring and Non-Recurring
            const componentTableId = lowerTableType.includes('recurring') && !lowerTableType.includes('non') 
                ? 'ucComponentTable' 
                : 'ucComponentNonRecurringTable';
            
            const componentTable = document.getElementById(componentTableId);
            if (componentTable) {
                const componentTbody = componentTable.querySelector('tbody');
                if (componentTbody && componentTbody.querySelector('tr')) {
                    const cells = componentTbody.querySelector('tr').querySelectorAll('td');
                    if (cells.length >= 3) {
                        // Set "Grant-in-aid-Total General" to same value as Expenditure incurred
                        cells[0].textContent = formatCurrency(expenditureHalf);
                        console.log(`Cell 0 "Grant-in-aid-Total General" set to: ${formatCurrency(expenditureHalf)}`);
                        // Set "Grant-in-aid-Salary" to empty or 0
                        cells[1].textContent = '';
                        // Set "Total" to same value as Expenditure incurred
                        cells[2].textContent = formatCurrency(expenditureHalf);
                        console.log(`Cell 2 "Total" set to: ${formatCurrency(expenditureHalf)}`);
                        console.log(`Component wise table (${tableType}) populated with same value as Expenditure incurred`);
                    }
                }
            }
        }

    } catch (error) {
        console.error(`Error populating ${tableType} table:`, error);
    }
}

// Create table from data
function createTable(tableId, data, columns) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 40px;">No data available</td></tr>';
        return;
    }

    // Get columns
    const cols = columns || Object.keys(data[0]);
    
    // Create header
    const headerRow = document.createElement('tr');
    cols.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.replace(/_/g, ' ');
        headerRow.appendChild(th);
    });
    // Add Remarks column header
    const remarksHeader = document.createElement('th');
    remarksHeader.textContent = 'Remarks (if any)';
    headerRow.appendChild(remarksHeader);
    thead.appendChild(headerRow);

    // Create rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement('td');
            let value = row[col];
            
            // Check if numeric
            const isNumeric = col.toLowerCase().includes('expenditure') || 
                             col.toLowerCase().includes('balance') || 
                             col.toLowerCase().includes('limit') ||
                             col.toLowerCase().includes('total') ||
                             col.toLowerCase().includes('spent');
            
            if (isNumeric && value !== null && value !== undefined) {
                td.textContent = formatCurrency(value);
                td.className = 'number';
                
                // Add color for balance
                if (col.toLowerCase().includes('balance')) {
                    const numValue = parseFloat(value);
                    if (numValue > 0) td.classList.add('positive');
                    else if (numValue < 0) td.classList.add('negative');
                }
            } else {
                td.textContent = value || '-';
            }
            
            tr.appendChild(td);
        });
        
        // Add Remarks column cell
        const remarksTd = document.createElement('td');
        remarksTd.textContent = '';
        tr.appendChild(remarksTd);
        
        // Add special styling for Grand Total row
        if (row['TG'] === 'Grand Total' || row[cols[0]] === 'Grand Total') {
            tr.classList.add('grand-total');
        }
        
        tbody.appendChild(tr);
    });
}

// Display T-Hub Totals Table
function displayTHubTotalsTable(thubTotals, toDate) {
    const section = document.getElementById('thubTotalsSection');
    if (!section) return;
    
    // Show the section
    section.style.display = 'block';
    
    const table = document.getElementById('thubTotalsTable');
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    const headers = [
        { main: 'Sanctioned Head', roman: '(I)' },
        { main: 'Total Funds Released', roman: '(II)' },
        { main: 'Total Expenditure', roman: '(III)' },
        { main: `Balance as on (${toDate || 'DD/MM/YYYY'})`, roman: '(VI = II - III)' },
        { main: 'Remarks', roman: '(if any)' }
    ];
    
    headers.forEach(headerObj => {
        const th = document.createElement('th');
        th.innerHTML = `${headerObj.main}<br/><strong>${headerObj.roman}</strong>`;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Create Recurring row
    const recurringRow = document.createElement('tr');
    const recurringCells = [
        'Recurring',
        thubTotals.total_funds_released || 0,
        thubTotals.total_expenditure || 0,
        thubTotals.balance || 0,
        ''
    ];
    
    recurringCells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 4) {
            td.textContent = value;
        } else {
            td.className = 'number';
            td.textContent = formatCurrency(value);
        }
        recurringRow.appendChild(td);
    });
    tbody.appendChild(recurringRow);
    
    // Create Total row
    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = 'bold';
    totalRow.style.backgroundColor = '#e3f2fd';
    
    const totalCells = [
        'Total',
        thubTotals.total_funds_released || 0,
        thubTotals.total_expenditure || 0,
        thubTotals.balance || 0,
        ''
    ];
    
    totalCells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 4) {
            td.textContent = value;
        } else {
            td.className = 'number';
            td.textContent = formatCurrency(value);
        }
        totalRow.appendChild(td);
    });
    tbody.appendChild(totalRow);
    
    window.thubTotalsData = thubTotals;
    window.thubTotalsToDate = toDate;
    
    // Store in global variable for downloads
    allThubSummaryData = [{
        sheetName: 'T-Hub-Wise Expenditure Summary',
        rows: [
            {
                sanctioned_head: 'Recurring',
                total_funds_released: thubTotals.total_funds_released || 0,
                total_expenditure: thubTotals.total_expenditure || 0,
                balance: thubTotals.balance || 0,
                remarks: ''
            },
            {
                sanctioned_head: 'Total',
                total_funds_released: thubTotals.total_funds_released || 0,
                total_expenditure: thubTotals.total_expenditure || 0,
                balance: thubTotals.balance || 0,
                remarks: ''
            }
        ]
    }];
}

// Download T-Hub Totals Table
function downloadTHubTotalsTable(format = 'excel') {
    const totals = window.thubTotalsData;
    const toDate = window.thubTotalsToDate || 'DD/MM/YYYY';
    
    if (!totals) {
        showAlert('No T-Hub totals data available to download', 'error');
        return;
    }
    
    if (format === 'excel') {
        downloadTHubTotalsExcel(totals, toDate);
    } else if (format === 'pdf') {
        downloadTHubTotalsPDF(totals, toDate);
    } else if (format === 'word') {
        downloadTHubTotalsWord(totals, toDate);
    }
}

// Download T-Hub Totals as Excel
function downloadTHubTotalsExcel(totals, toDate) {
    // Create CSV content with Sanctioned Head column
    const csv = `Sanctioned Head (I),Total Funds Released (II),Total Expenditure (III),Balance as on (${toDate}) (VI = II - III)
Recurring,${totals.total_funds_released},${totals.total_expenditure},${totals.balance}
Total,${totals.total_funds_released},${totals.total_expenditure},${totals.balance}`;
    
    // Create Excel file using CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'T-Hub_Expenditure_Totals.xlsx');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('T-Hub totals downloaded successfully as Excel!', 'success');
}

// Download T-Hub Totals as CSV
function downloadTHubTotalsCSV(totals, toDate) {
    const csv = `Sanctioned Head (I),Total Funds Released (II),Total Expenditure (III),Balance as on (${toDate}) (VI = II - III)
Recurring,${totals.total_funds_released},${totals.total_expenditure},${totals.balance}
Total,${totals.total_funds_released},${totals.total_expenditure},${totals.balance}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'T-Hub_Expenditure_Totals.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('T-Hub totals downloaded successfully as CSV!', 'success');
}

// Download T-Hub Totals as PDF
function downloadTHubTotalsPDF(totals, toDate) {
    // This will be similar to TG PDF download
    const docContent = `
    <html>
    <head>
        <title>T-Hub Expenditure Totals</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #0066CC; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #CCCCCC; padding: 12px; text-align: right; }
            th { background-color: #FFFFFF; font-weight: bold; }
            td:first-child, th:first-child { text-align: left; }
        </style>
    </head>
    <body>
        <h1>T-Hub - Expenditure Totals</h1>
        <table>
            <thead>
                <tr>
                    <th>Sanctioned Head (I)</th>
                    <th>Total Funds Released (II)</th>
                    <th>Total Expenditure (III)</th>
                    <th>Balance as on (${toDate}) (VI = II - III)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Recurring</td>
                    <td>${formatCurrency(totals.total_funds_released)}</td>
                    <td>${formatCurrency(totals.total_expenditure)}</td>
                    <td>${formatCurrency(totals.balance)}</td>
                </tr>
                <tr style="font-weight: bold; background-color: #e3f2fd;">
                    <td>Total</td>
                    <td>${formatCurrency(totals.total_funds_released)}</td>
                    <td>${formatCurrency(totals.total_expenditure)}</td>
                    <td>${formatCurrency(totals.balance)}</td>
                </tr>
            </tbody>
        </table>
    </body>
    </html>
    `;
    
    const newWindow = window.open('', 'Print-Window');
    newWindow.document.open();
    newWindow.document.write(docContent);
    newWindow.document.close();
    setTimeout(() => {
        newWindow.print();
        newWindow.close();
    }, 250);
    
    showAlert('T-Hub totals PDF prepared for printing!', 'success');
}

// Download T-Hub Totals as Word
function downloadTHubTotalsWord(totals, toDate) {
    // For simplicity, fallback to CSV format
    downloadTHubTotalsCSV(totals, toDate);
}

// Download TG PDF
async function downloadTGPDF(data, toDate) {
    try {
        const response = await fetch('/download-tg-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tg: data.TG,
                total_funds_released: data.Total_Funds_Released,
                total_expenditure: data.Total_Expenditure,
                balance: data.Balance,
                to_date: toDate
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }
        
        // Get the PDF blob
        const blob = await response.blob();
        
        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element and click it
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.TG}_expenditure_summary.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        window.URL.revokeObjectURL(url);
        
        showAlert(`${data.TG} PDF downloaded successfully!`, 'success');
    } catch (error) {
        console.error('Error downloading PDF:', error);
        showAlert('Error downloading PDF: ' + error.message, 'error');
    }
}

// Download TG Detailed Table as CSV
function downloadTGDetailedTable(tgName, tableData, toDate) {
    if (!tableData || tableData.length === 0) {
        showAlert('No data available to download', 'error');
        return;
    }
    
    const headers = ['Sanctioned Head', 'Total Funds Released', 'Total Expenditure', 'Balance as on (DD/MM/YYYY)', 'Remarks (if any)'];
    
    let csv = headers.join(',') + '\n';
    
    tableData.forEach(row => {
        const values = [
            row.sanctioned_head || '',
            row.total_funds_released || '',
            row.total_expenditure || '',
            row.balance || '',
            row.remarks || ''
        ];
        csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${tgName}_detailed_table.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert(`${tgName} detailed table downloaded successfully!`, 'success');
}

// Download All TG Detailed Tables Combined as one document
function downloadAllTGTables() {
    // Check which tab button is active to determine which sheet to download
    const allTabButtons = document.querySelectorAll('.tab-btn');
    let isNonRecurringActive = false;
    let isUCTab = false;
    
    // Find the active tab button and check if it's the Non-Recurring tab or UC tab
    allTabButtons.forEach(btn => {
        if (btn.classList.contains('active')) {
            const tabId = btn.dataset.tab;
            // Check if it's a UC tab
            if (tabId === 'ucsummary' || tabId === 'ucsummarynonrecurring') {
                isUCTab = true;
                if (tabId === 'ucsummarynonrecurring') {
                    isNonRecurringActive = true;
                }
            }
            // Check if it's a TG Non-Recurring tab
            else if (tabId === 'tgsummarynonrecurring') {
                isNonRecurringActive = true;
            }
        }
    });
    
    if (isUCTab) {
        // Download UC data based on whether Non-Recurring is active
        if (isNonRecurringActive) {
            // Download Non-Recurring UC data
            if (!allUCDetailedDataNonRecurring || allUCDetailedDataNonRecurring.length === 0) {
                showAlert('No UC Non-Recurring data available to download', 'error');
                return;
            }
            showFormatSelectionDialog('uc-nonrecurring');
        } else {
            // Download Recurring UC data (default)
            if (!allUCDetailedData || allUCDetailedData.length === 0) {
                showAlert('No UC Recurring data available to download', 'error');
                return;
            }
            showFormatSelectionDialog('uc-recurring');
        }
    } else {
        // Download TG data (for backward compatibility)
        if (isNonRecurringActive) {
            // Download Non-Recurring data
            if (!allTGDetailedDataNonRecurring || allTGDetailedDataNonRecurring.length === 0) {
                showAlert('No TG Non-Recurring data available to download', 'error');
                return;
            }
            showFormatSelectionDialog('tg-nonrecurring');
        } else {
            // Download Recurring data (default)
            if (!allTGDetailedData || allTGDetailedData.length === 0) {
                showAlert('No TG Recurring data available to download', 'error');
                return;
            }
            showFormatSelectionDialog('tg-recurring');
        }
    }
}


// Show format selection dialog
function showFormatSelectionDialog(tableType = 'tg') {
    // Create modal dialog
    const modal = document.createElement('div');
    modal.id = 'formatModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        text-align: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Select Download Format';
    title.style.marginBottom = '20px';
    title.style.color = '#212529';
    
    const description = document.createElement('p');
    let descText = 'Choose the format you want to download the ';
    if (tableType === 'thub') {
        descText += 'T-Hub';
    } else if (tableType === 'tg-recurring') {
        descText += 'TG-Wise Exp Recurring';
    } else if (tableType === 'tg-nonrecurring') {
        descText += 'TG-Wise Exp Non-Recurring';
    } else if (tableType === 'uc-recurring') {
        descText += 'UC Exp Recurring';
    } else if (tableType === 'uc-nonrecurring') {
        descText += 'UC Exp Non-Recurring';
    } else {
        descText += 'TG';
    }
    descText += ' tables:';
    description.textContent = descText;
    description.style.marginBottom = '20px';
    description.style.color = '#495057';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.flexDirection = 'column';
    
    const formats = [
        { name: 'Excel', icon: '📊', action: 'excel' },
        { name: 'PDF', icon: '📄', action: 'pdf' },
        { name: 'Word', icon: '📃', action: 'word' }
    ];
    
    formats.forEach(format => {
        const btn = document.createElement('button');
        btn.textContent = `${format.icon} Download as ${format.name}`;
        btn.style.cssText = `
            padding: 12px 20px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        btn.onmouseover = () => btn.style.background = '#004d99';
        btn.onmouseout = () => btn.style.background = '#0066cc';
        btn.onclick = () => {
            if (tableType === 'thub') {
                downloadTHubTablesInFormat(format.action);
            } else if (tableType === 'tg-recurring') {
                downloadTGRecurringInFormat(format.action);
            } else if (tableType === 'tg-nonrecurring') {
                downloadTGNonRecurringInFormat(format.action);
            } else if (tableType === 'uc-recurring') {
                downloadUCRecurringInFormat(format.action);
            } else if (tableType === 'uc-nonrecurring') {
                downloadUCNonRecurringInFormat(format.action);
            } else {
                downloadTGTablesInFormat(format.action);
            }
            modal.remove();
        };
        buttonContainer.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        padding: 12px 20px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        margin-top: 10px;
        transition: all 0.3s ease;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#5a6268';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#6c757d';
    cancelBtn.onclick = () => modal.remove();
    buttonContainer.appendChild(cancelBtn);
    
    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

// Show format selection dialog for All Documents
function showAllDocumentsFormatSelectionDialog() {
    // Create modal dialog
    const modal = document.createElement('div');
    modal.id = 'allDocumentsFormatModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        text-align: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Select Download Format';
    title.style.marginBottom = '20px';
    title.style.color = '#212529';
    
    const description = document.createElement('p');
    description.textContent = 'Choose the format to download all document tables:';
    description.style.marginBottom = '20px';
    description.style.color = '#495057';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.flexDirection = 'column';
    
    const formats = [
        { name: 'Excel', icon: '📊', action: 'excel' },
        { name: 'PDF', icon: '📄', action: 'pdf' },
        { name: 'Word', icon: '📃', action: 'word' }
    ];
    
    formats.forEach(format => {
        const btn = document.createElement('button');
        btn.textContent = `${format.icon} Download as ${format.name}`;
        btn.style.cssText = `
            padding: 12px 20px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        btn.onmouseover = () => btn.style.background = '#004d99';
        btn.onmouseout = () => btn.style.background = '#0066cc';
        btn.onclick = () => {
            downloadAllDocuments(format.action);
            modal.remove();
        };
        buttonContainer.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        padding: 12px 20px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        margin-top: 10px;
        transition: all 0.3s ease;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#5a6268';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#6c757d';
    cancelBtn.onclick = () => modal.remove();
    buttonContainer.appendChild(cancelBtn);
    
    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

// Download All Documents function
async function downloadAllDocuments(format) {
    try {
        // Prepare the data from the document view tables
        const thubTgsData = window.thubTgsComparisonData || {};
        const thubTotalsData = window.thubTotalsData || {};
        
        // Debug logging
        console.log('DEBUG: Full window object check for thubTgsComparisonData:', window.thubTgsComparisonData);
        console.log('DEBUG: thubTgsData:', thubTgsData);
        console.log('DEBUG: thubTotalsData:', thubTotalsData);
        
        // If thubTgsData is empty, try to get from the displayed table
        if (!thubTgsData || Object.keys(thubTgsData).length === 0) {
            console.log('WARNING: thubTgsComparisonData is empty! Trying to extract from frontend table...');
        }
        
        // Collect TG details from the displayed tables
        const tgDetailsData = [];
        const tgSections = document.querySelectorAll('#tgDetailedTablesContainer > div');
        
        tgSections.forEach((section, index) => {
            const title = section.querySelector('.tg-detailed-header span')?.textContent || `TG ${index + 1}`;
            const table = section.querySelector('table');
            
            if (table) {
                const columns = [];
                const rows = [];
                
                // Extract headers
                table.querySelectorAll('thead th').forEach(th => {
                    columns.push(th.textContent);
                });
                
                // Extract rows
                table.querySelectorAll('tbody tr').forEach(tr => {
                    const row = [];
                    tr.querySelectorAll('td').forEach(td => {
                        row.push(td.textContent);
                    });
                    if (row.length > 0) rows.push(row);
                });
                
                if (columns.length > 0 && rows.length > 0) {
                    tgDetailsData.push({
                        title: title,
                        columns: columns,
                        rows: rows
                    });
                }
            }
        });
        
        const payload = {
            format: format,
            thubTgs: thubTgsData,
            thubTotals: thubTotalsData,
            tgDetails: tgDetailsData
        };
        
        const response = await fetch('/download-all-documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Download failed');
        }
        
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `All_Document_Tables.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'docx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showAlert('File downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading all documents:', error);
        showAlert(`Error downloading file: ${error.message}`, 'error');
    }
}

// Show format selection dialog for T-Hub Totals
function showTHubTotalsFormatDialog() {
    const modal = document.createElement('div');
    modal.id = 'thubTotalsFormatModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        text-align: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Select Download Format';
    title.style.marginBottom = '20px';
    title.style.color = '#212529';
    
    const description = document.createElement('p');
    description.textContent = 'Choose the format you want to download the T-Hub Expenditure Totals:';
    description.style.marginBottom = '20px';
    description.style.color = '#495057';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.flexDirection = 'column';
    
    const formats = [
        { name: 'Excel', icon: '📊', action: 'excel' },
        { name: 'PDF', icon: '📄', action: 'pdf' },
        { name: 'Word', icon: '📃', action: 'word' }
    ];
    
    formats.forEach(format => {
        const btn = document.createElement('button');
        btn.textContent = `${format.icon} Download as ${format.name}`;
        btn.style.cssText = `
            padding: 12px 20px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        btn.onmouseover = () => btn.style.background = '#004d99';
        btn.onmouseout = () => btn.style.background = '#0066cc';
        btn.onclick = () => {
            downloadTHubTotalsTable(format.action);
            modal.remove();
        };
        buttonContainer.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        padding: 12px 20px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        margin-top: 10px;
        transition: all 0.3s ease;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#5a6268';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#6c757d';
    cancelBtn.onclick = () => modal.remove();
    buttonContainer.appendChild(cancelBtn);
    
    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

// Download TG tables in selected format
function downloadTGTablesInFormat(format) {
    if (!allTGDetailedData || allTGDetailedData.length === 0) {
        showAlert('No TG data available to download', 'error');
        return;
    }
    
    // Send request to backend with format
    fetch('/download-tg-tables', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            format: format,
            data: allTGDetailedData
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename based on format
        const filename = `All_TG_Detailed_Tables.${getFileExtension(format)}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert(`TG tables downloaded successfully as ${format.toUpperCase()}!`, 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error downloading file. Please try again.', 'error');
    });
}

// Get file extension based on format
function getFileExtension(format) {
    const extensions = {
        'excel': 'xlsx',
        'pdf': 'pdf',
        'word': 'docx'
    };
    return extensions[format] || 'xlsx';
}

// Download TG-Wise Exp Recurring in specific format
function downloadTGRecurringInFormat(format) {
    if (!allTGDetailedData || allTGDetailedData.length === 0) {
        showAlert('No TG Recurring data available to download', 'error');
        return;
    }
    
    // Prepare all table data to send
    const downloadData = {
        comparisonTable: allComparisonTableData,
        thubSummaryTable: allThubSummaryData,
        tgDetailedTables: allTGDetailedData
    };
    
    // Send request to backend with format
    fetch('/download-tg-tables', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            format: format,
            data: downloadData,
            sheetType: 'recurring'
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename based on format
        const filename = `TG-Wise_Exp_Recurring.${getFileExtension(format)}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert(`TG-Wise Exp Recurring sheet downloaded successfully as ${format.toUpperCase()}!`, 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error downloading file. Please try again.', 'error');
    });
}

// Download TG-Wise Exp Non-Recurring in specific format
function downloadTGNonRecurringInFormat(format) {
    if (!allTGDetailedDataNonRecurring || allTGDetailedDataNonRecurring.length === 0) {
        showAlert('No TG Non-Recurring data available to download', 'error');
        return;
    }
    
    // Prepare all table data to send
    const downloadData = {
        comparisonTable: allComparisonTableDataNonRecurring,
        thubSummaryTable: allThubSummaryDataNonRecurring,
        tgDetailedTables: allTGDetailedDataNonRecurring
    };
    
    // Send request to backend with format
    fetch('/download-tg-tables', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            format: format,
            data: downloadData,
            sheetType: 'nonrecurring'
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename based on format
        const filename = `TG-Wise_Exp_Non-Recurring.${getFileExtension(format)}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert(`TG-Wise Exp Non-Recurring sheet downloaded successfully as ${format.toUpperCase()}!`, 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error downloading file. Please try again.', 'error');
    });
}

// Download UC Recurring data in specified format
function downloadUCRecurringInFormat(format) {
    if (!allUCDetailedData || allUCDetailedData.length === 0) {
        showAlert('No UC Recurring data available to download', 'error');
        return;
    }
    
    // Prepare all table data to send
    const downloadData = {
        ucTables: allUCDetailedData
    };
    
    // Send request to backend with format
    fetch('/download-tg-tables', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            format: format,
            data: downloadData,
            sheetType: 'recurring',
            isUC: true
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename based on format
        const filename = `UC_Exp_Recurring.${getFileExtension(format)}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert(`UC Exp Recurring sheet downloaded successfully as ${format.toUpperCase()}!`, 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error downloading file. Please try again.', 'error');
    });
}

// Download UC Non-Recurring data in specified format
function downloadUCNonRecurringInFormat(format) {
    if (!allUCDetailedDataNonRecurring || allUCDetailedDataNonRecurring.length === 0) {
        showAlert('No UC Non-Recurring data available to download', 'error');
        return;
    }
    
    // Prepare all table data to send
    const downloadData = {
        ucTables: allUCDetailedDataNonRecurring
    };
    
    // Send request to backend with format
    fetch('/download-tg-tables', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            format: format,
            data: downloadData,
            sheetType: 'nonrecurring',
            isUC: true
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename based on format
        const filename = `UC_Exp_Non-Recurring.${getFileExtension(format)}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert(`UC Exp Non-Recurring sheet downloaded successfully as ${format.toUpperCase()}!`, 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error downloading file. Please try again.', 'error');
    });
}

// Download all T-Hub tables
function downloadAllTHubTables() {
    if (!allTHubData || allTHubData.length === 0) {
        showAlert('No T-Hub data available to download', 'error');
        return;
    }
    
    // Show format selection dialog for T-Hub
    showFormatSelectionDialog('thub');
}

// Download T-Hub tables in selected format
function downloadTHubTablesInFormat(format) {
    if (!allTHubData || allTHubData.length === 0) {
        showAlert('No T-Hub data available to download', 'error');
        return;
    }
    
    // Send request to backend with format
    fetch('/download-thub-tables', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            format: format,
            data: allTHubData
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename based on format
        const filename = `All_T-Hub_Tables.${getFileExtension(format)}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert(`T-Hub tables downloaded successfully as ${format.toUpperCase()}!`, 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error downloading file. Please try again.', 'error');
    });
}

// Download T-Hub Totals Table in selected format
function downloadTHubTotalsTable(format) {
    if (!window.thubTotalsData) {
        showAlert('No T-Hub totals data available to download', 'error');
        return;
    }
    
    // Send request to backend with format
    fetch('/download-thub-totals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            format: format,
            data: window.thubTotalsData,
            toDate: window.thubTotalsToDate || ''
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename based on format
        const filename = `T-Hub_Expenditure_Totals.${getFileExtension(format)}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert(`T-Hub totals downloaded successfully as ${format.toUpperCase()}!`, 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error downloading file. Please try again.', 'error');
    });
}

// Show format selection dialog for T-Hub & TGs Comparison
function showThubTgsComparisonFormatDialog() {
    const modal = document.createElement('div');
    modal.id = 'thubTgsComparisonFormatModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        text-align: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Select Download Format';
    title.style.marginBottom = '20px';
    title.style.color = '#212529';
    
    const description = document.createElement('p');
    description.textContent = 'Choose the format you want to download the T-Hub & TGs Comparison:';
    description.style.marginBottom = '20px';
    description.style.color = '#495057';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.flexDirection = 'column';
    
    const formats = [
        { name: 'Excel', icon: '📊', action: 'excel' },
        { name: 'PDF', icon: '📄', action: 'pdf' },
        { name: 'Word', icon: '📃', action: 'word' }
    ];
    
    formats.forEach(format => {
        const btn = document.createElement('button');
        btn.textContent = `${format.icon} Download as ${format.name}`;
        btn.style.cssText = `
            padding: 12px 20px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        btn.onmouseover = () => btn.style.background = '#004d99';
        btn.onmouseout = () => btn.style.background = '#0066cc';
        btn.onclick = () => {
            downloadThubTgsComparison(format.action);
            modal.remove();
        };
        buttonContainer.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        padding: 12px 20px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        margin-top: 10px;
        transition: all 0.3s ease;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#5a6268';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#6c757d';
    cancelBtn.onclick = () => modal.remove();
    buttonContainer.appendChild(cancelBtn);
    
    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

// Download T-Hub & TGs Comparison Table in selected format
function downloadThubTgsComparison(format) {
    if (!thubTgsComparisonData) {
        showAlert('No T-Hub & TGs comparison data available to download', 'error');
        return;
    }
    
    // Send request to backend with format
    fetch('/download-thub-tgs-comparison', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            format: format,
            data: thubTgsComparisonData
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename based on format
        const filename = `T-Hub_TGs_Comparison.${getFileExtension(format)}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert(`T-Hub & TGs comparison downloaded successfully as ${format.toUpperCase()}!`, 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error downloading file. Please try again.', 'error');
    });
}

// Display T-Hub & TGs Comparison Table
function displayTHubTgsComparison(tgSummaryData, thubSummaryData, toDate) {
    const section = document.getElementById('thubTgsComparisonSection');
    if (!section) return;
    
    // Debug: Log the input data
    console.log('DEBUG displayTHubTgsComparison - thubSummaryData:', thubSummaryData);
    console.log('DEBUG displayTHubTgsComparison - tgSummaryData:', tgSummaryData);
    
    // Show the section
    section.style.display = 'block';
    
    const table = document.getElementById('thubTgsComparisonTable');
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    const headers = [
        { main: 'T-Hub & TG', roman: '(I)' },
        { main: 'Total Funds Released', roman: '(II)' },
        { main: 'Total Expenditure', roman: '(III)' },
        { main: `Balance as on (${toDate || 'DD/MM/YYYY'})`, roman: '(IV = II - III)' },
        { main: 'Remarks', roman: '(if any)' }
    ];
    
    headers.forEach(headerObj => {
        const th = document.createElement('th');
        th.innerHTML = `${headerObj.main}<br/><strong>${headerObj.roman}</strong>`;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Get T-Hub totals for RECURRING only
    let thubTotalFundsReleased = 0;
    let thubTotalExpenditure = 0;
    let thubBalance = 0;
    
    if (thubSummaryData && thubSummaryData.length > 0) {
        thubSummaryData.forEach(row => {
            // Check if row is NOT a Grand Total and is RECURRING
            const isGrandTotal = row['Hub'] === 'Grand Total';
            const isRecurring = row['Grant Type'] === 'Recurring';
            if (!isGrandTotal && isRecurring) {
                const fundLimit = parseFloat(row['Expenditure_Limit']) || 0;
                const fundSpent = parseFloat(row['Expenditure_Spent']) || 0;
                const balance = parseFloat(row['Balance']) || 0;
                
                thubTotalFundsReleased += fundLimit;
                thubTotalExpenditure += fundSpent;
                thubBalance += balance;
            }
        });
    }
    
    console.log('DEBUG: Calculated thubTotalFundsReleased:', thubTotalFundsReleased, 'thubTotalExpenditure:', thubTotalExpenditure, 'thubBalance:', thubBalance);
    
    // Get TGs totals - sum all TG rows (they don't have Grand Total row)
    let tgsTotalFundsReleased = 0;
    let tgsTotalExpenditure = 0;
    let tgsBalance = 0;
    
    if (tgSummaryData && tgSummaryData.length > 0) {
        tgSummaryData.forEach(row => {
            // Skip Grand Total if it exists
            const isGrandTotal = row['TG'] === 'Grand Total';
            if (!isGrandTotal) {
                // Try different column name patterns - check for Recurring or Non-Recurring
                const fundLimit = parseFloat(row['Recurring - Expenditure Limit']) || parseFloat(row['Non-Recurring - Expenditure Limit']) || 0;
                const fundSpent = parseFloat(row['Recurring - Expenditure Spent']) || parseFloat(row['Non-Recurring - Expenditure Spent']) || 0;
                const balance = parseFloat(row['Recurring - Balance']) || parseFloat(row['Non-Recurring - Balance']) || 0;
                
                tgsTotalFundsReleased += fundLimit;
                tgsTotalExpenditure += fundSpent;
                tgsBalance += balance;
            }
        });
    }
    
    console.log('DEBUG: Calculated tgsTotalFundsReleased:', tgsTotalFundsReleased, 'tgsTotalExpenditure:', tgsTotalExpenditure, 'tgsBalance:', tgsBalance);
    
    // Add T-Hub row
    const thubRow = document.createElement('tr');
    const thubCells = [
        'T-Hub',
        thubTotalFundsReleased,
        thubTotalExpenditure,
        thubBalance,
        ''
    ];
    
    thubCells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 4) {
            td.textContent = value;
        } else {
            td.className = 'number';
            td.textContent = formatCurrency(value);
        }
        thubRow.appendChild(td);
    });
    tbody.appendChild(thubRow);
    
    // Add TGs row
    const tgsRow = document.createElement('tr');
    const tgsCells = [
        'TGs',
        tgsTotalFundsReleased,
        tgsTotalExpenditure,
        tgsBalance,
        ''
    ];
    
    tgsCells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 4) {
            td.textContent = value;
        } else {
            td.className = 'number';
            td.textContent = formatCurrency(value);
        }
        tgsRow.appendChild(td);
    });
    tbody.appendChild(tgsRow);
    
    // Add Total row
    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = 'bold';
    totalRow.style.backgroundColor = '#e3f2fd';
    
    const totalCells = [
        'Total',
        thubTotalFundsReleased + tgsTotalFundsReleased,
        thubTotalExpenditure + tgsTotalExpenditure,
        thubBalance + tgsBalance,
        ''
    ];
    
    totalCells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 4) {
            td.textContent = value;
        } else {
            td.className = 'number';
            td.textContent = formatCurrency(value);
        }
        totalRow.appendChild(td);
    });
    tbody.appendChild(totalRow);
    
    // Store data globally for download
    window.thubTgsComparisonData = {
        toDate: toDate,
        thubFundsReleased: thubTotalFundsReleased,
        thubExpenditure: thubTotalExpenditure,
        thubBalance: thubBalance,
        tgsFundsReleased: tgsTotalFundsReleased,
        tgsExpenditure: tgsTotalExpenditure,
        tgsBalance: tgsBalance,
        totalFundsReleased: (thubTotalFundsReleased + tgsTotalFundsReleased),
        totalExpenditure: (thubTotalExpenditure + tgsTotalExpenditure),
        totalBalance: (thubBalance + tgsBalance),
        thubData: thubSummaryData && thubSummaryData.length > 0,
        tgsData: tgSummaryData && tgSummaryData.length > 0
    };
    
    // Also store in the global variable for downloads
    allComparisonTableData = [{
        sheetName: 'Total Expenditure (T-Hub & TGs)',
        rows: [
            {
                name: 'T-Hub',
                fundsReleased: thubTotalFundsReleased,
                expenditure: thubTotalExpenditure,
                balance: thubBalance,
                remarks: ''
            },
            {
                name: 'TGs',
                fundsReleased: tgsTotalFundsReleased,
                expenditure: tgsTotalExpenditure,
                balance: tgsBalance,
                remarks: ''
            },
            {
                name: 'Total',
                fundsReleased: (thubTotalFundsReleased + tgsTotalFundsReleased),
                expenditure: (thubTotalExpenditure + tgsTotalExpenditure),
                balance: (thubBalance + tgsBalance),
                remarks: ''
            }
        ]
    }];
    
    console.log('DEBUG: thubTgsComparisonData stored:', window.thubTgsComparisonData);
}

// Display TG Detailed Tables (recurring data summary by TG)
function displayTGDetailedTables(tgSummaryData, toDate) {
    const container = document.getElementById('tgDetailedTablesContainer');
    if (!container) return;
    
    // Mapping of TG codes to institution names
    const tgNameMapping = {
        'TG1': 'QuILA',
        'TG2': 'PIPETA',
        'TG3': 'TAHQEECAT',
        'TG4': 'QuEPRAN'
    };
    
    container.innerHTML = '';
    allTGDetailedData = []; // Reset the global data
    
    if (!tgSummaryData || tgSummaryData.length === 0) return;
    
    // Filter out Grand Total row
    const tgData = tgSummaryData.filter(row => row['TG'] !== 'Grand Total');
    
    // Process each TG
    tgData.forEach(row => {
        const tgName = row['TG'];
        const institutionName = tgNameMapping[tgName] || 'Unknown';
        
        const section = document.createElement('div');
        section.className = 'tg-detailed-section';
        
        // Header without individual download button
        const headerDiv = document.createElement('div');
        headerDiv.className = 'tg-detailed-header';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = `${tgName} - ${institutionName}`;
        
        headerDiv.appendChild(titleSpan);
        section.appendChild(headerDiv);
        
        // Store data for combined download
        const tableData = {
            tgName: tgName,
            institutionName: institutionName,
            toDate: toDate,
            rows: [
                {
                    sanctioned_head: 'Recurring',
                    total_funds_released: row['Recurring - Expenditure Limit'],
                    total_expenditure: row['Recurring - Expenditure Spent'],
                    balance_date: toDate,
                    balance: row['Recurring - Balance'],
                    remarks: ''
                },
                {
                    sanctioned_head: 'Total',
                    total_funds_released: row['Recurring - Expenditure Limit'],
                    total_expenditure: row['Recurring - Expenditure Spent'],
                    balance_date: toDate,
                    balance: row['Recurring - Balance'],
                    remarks: ''
                }
            ]
        };
        
        allTGDetailedData.push(tableData);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'tg-detail-table';
        
        // Table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
const headers = [
  { main: "Sanctioned Head", roman: "(I)" },
  { main: "Total Funds Released", roman: "(II)" },
  { main: "Total Expenditure", roman: "(III)" },
  { main: `Balance as on (${toDate})`, roman: "(IV = II - III)" },
  { main: "Remarks", roman: "(if any)" }
];
        
        headers.forEach(headerObj => {
            const th = document.createElement('th');
            th.innerHTML = `${headerObj.main}<br/><strong>${headerObj.roman}</strong>`;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
         table.appendChild(thead);

        
        // Table body - Recurring row
        const tbody = document.createElement('tbody');
        const recurringRow = document.createElement('tr');
        
        // Get values from tg_summary_table
        const recurringData = [
            'Recurring',
            row['Recurring - Expenditure Limit'] || '',
            row['Recurring - Expenditure Spent'] || '',
            row['Recurring - Balance'] || '',
            ''
        ];
        
        recurringData.forEach((value, index) => {
            const td = document.createElement('td');
            if (index > 0 && index < 4) {
                td.className = 'number';
                td.textContent = formatCurrency(value);
            } else {
                td.textContent = value;
            }
            recurringRow.appendChild(td);
        });
        tbody.appendChild(recurringRow);
        
        // Total row
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.style.backgroundColor = '#e3f2fd';
        
        const totalData = [
            'Total',
            row['Recurring - Expenditure Limit'] || '',
            row['Recurring - Expenditure Spent'] || '',
            row['Recurring - Balance'] || '',
            ''
        ];
        
        totalData.forEach((value, index) => {
            const td = document.createElement('td');
            if (index > 0 && index < 4) {
                td.className = 'number';
                td.textContent = formatCurrency(value);
            } else {
                td.textContent = value;
            }
            totalRow.appendChild(td);
        });
        tbody.appendChild(totalRow);
        
        table.appendChild(tbody);
        section.appendChild(table);
        
        container.appendChild(section);
    });
}

// Display TG Detailed Tables for Non-Recurring Data
function displayTGDetailedTablesNonRecurring(tgSummaryData, toDate) {
    const container = document.getElementById('tgDetailedTablesContainerNonRecurring');
    if (!container) return;
    
    // Mapping of TG codes to institution names
    const tgNameMapping = {
        'TG1': 'QuILA',
        'TG2': 'PIPETA',
        'TG3': 'TAHQEECAT',
        'TG4': 'QuEPRAN'
    };
    
    container.innerHTML = '';
    allTGDetailedDataNonRecurring = []; // Reset the global data for non-recurring
    
    if (!tgSummaryData || tgSummaryData.length === 0) return;
    
    // Filter out Grand Total row
    const tgData = tgSummaryData.filter(row => row['TG'] !== 'Grand Total');
    
    // Process each TG
    tgData.forEach(row => {
        const tgName = row['TG'];
        const institutionName = tgNameMapping[tgName] || 'Unknown';
        
        const section = document.createElement('div');
        section.className = 'tg-detailed-section';
        
        // Header without individual download button
        const headerDiv = document.createElement('div');
        headerDiv.className = 'tg-detailed-header';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = `${tgName} - ${institutionName}`;
        
        headerDiv.appendChild(titleSpan);
        section.appendChild(headerDiv);
        
        // Store data for combined download
        const tableData = {
            tgName: tgName,
            institutionName: institutionName,
            toDate: toDate,
            rows: [
                {
                    sanctioned_head: 'Non-Recurring',
                    total_funds_released: row['Non-Recurring - Expenditure Limit'],
                    total_expenditure: row['Non-Recurring - Expenditure Spent'],
                    balance_date: toDate,
                    balance: row['Non-Recurring - Balance'],
                    remarks: ''
                },
                {
                    sanctioned_head: 'Total',
                    total_funds_released: row['Non-Recurring - Expenditure Limit'],
                    total_expenditure: row['Non-Recurring - Expenditure Spent'],
                    balance_date: toDate,
                    balance: row['Non-Recurring - Balance'],
                    remarks: ''
                }
            ]
        };
        
        allTGDetailedDataNonRecurring.push(tableData);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'tg-detail-table';
        
        // Table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = [
            { main: "Sanctioned Head", roman: "(I)" },
            { main: "Total Funds Released", roman: "(II)" },
            { main: "Total Expenditure", roman: "(III)" },
            { main: `Balance as on (${toDate})`, roman: "(IV = II - III)" },
            { main: "Remarks", roman: "(if any)" }
        ];
        
        headers.forEach(headerObj => {
            const th = document.createElement('th');
            th.innerHTML = `${headerObj.main}<br/><strong>${headerObj.roman}</strong>`;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        
        // Table body - Non-Recurring row
        const tbody = document.createElement('tbody');
        const nonRecurringRow = document.createElement('tr');
        
        // Get values from tg_summary_table (Non-Recurring columns)
        const nonRecurringData = [
            'Non-Recurring',
            row['Non-Recurring - Expenditure Limit'] || '',
            row['Non-Recurring - Expenditure Spent'] || '',
            row['Non-Recurring - Balance'] || '',
            ''
        ];
        
        nonRecurringData.forEach((value, index) => {
            const td = document.createElement('td');
            if (index > 0 && index < 4) {
                td.className = 'number';
                td.textContent = formatCurrency(value);
            } else {
                td.textContent = value;
            }
            nonRecurringRow.appendChild(td);
        });
        tbody.appendChild(nonRecurringRow);
        
        // Total row
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.style.backgroundColor = '#e3f2fd';
        
        const totalData = [
            'Total',
            row['Non-Recurring - Expenditure Limit'] || '',
            row['Non-Recurring - Expenditure Spent'] || '',
            row['Non-Recurring - Balance'] || '',
            ''
        ];
        
        totalData.forEach((value, index) => {
            const td = document.createElement('td');
            if (index > 0 && index < 4) {
                td.className = 'number';
                td.textContent = formatCurrency(value);
            } else {
                td.textContent = value;
            }
            totalRow.appendChild(td);
        });
        tbody.appendChild(totalRow);
        
        table.appendChild(tbody);
        section.appendChild(table);
        
        container.appendChild(section);
    });
}

// Display T-Hub & TGs Comparison for Non-Recurring
function displayTHubTgsComparisonNonRecurring(tgSummaryData, thubSummaryData, toDate) {
    const section = document.getElementById('thubTgsComparisonSectionNonRecurring');
    if (!section) return;
    
    // Debug: Log the input data
    console.log('DEBUG displayTHubTgsComparisonNonRecurring - thubSummaryData:', thubSummaryData);
    console.log('DEBUG displayTHubTgsComparisonNonRecurring - tgSummaryData:', tgSummaryData);
    
    // Show the section
    section.style.display = 'block';
    
    const table = document.getElementById('thubTgsComparisonTableNonRecurring');
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    const headers = [
        { main: 'T-Hub & TG', roman: '(I)' },
        { main: 'Total Funds Released', roman: '(II)' },
        { main: 'Total Expenditure', roman: '(III)' },
        { main: `Balance as on (${toDate || 'DD/MM/YYYY'})`, roman: '(IV = II - III)' },
        { main: 'Remarks', roman: '(if any)' }
    ];
    
    headers.forEach(headerObj => {
        const th = document.createElement('th');
        th.innerHTML = `${headerObj.main}<br/><strong>${headerObj.roman}</strong>`;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Get T-Hub totals for Non-Recurring only
    let thubTotalFundsReleased = 0;
    let thubTotalExpenditure = 0;
    let thubBalance = 0;
    
    if (thubSummaryData && thubSummaryData.length > 0) {
        thubSummaryData.forEach(row => {
            // Check if row is NOT a Grand Total and is NON-RECURRING
            const isGrandTotal = row['Hub'] === 'Grand Total';
            const isNonRecurring = row['Grant Type'] === 'Non-Recurring';
            if (!isGrandTotal && isNonRecurring) {
                const fundLimit = parseFloat(row['Expenditure_Limit']) || 0;
                const fundSpent = parseFloat(row['Expenditure_Spent']) || 0;
                const balance = parseFloat(row['Balance']) || 0;
                
                thubTotalFundsReleased += fundLimit;
                thubTotalExpenditure += fundSpent;
                thubBalance += balance;
            }
        });
    }
    
    console.log('DEBUG: Calculated thubTotalFundsReleased (Non-Recurring):', thubTotalFundsReleased, 'thubTotalExpenditure:', thubTotalExpenditure, 'thubBalance:', thubBalance);
    
    // Get TGs totals for Non-Recurring - sum all TG rows (they don't have Grand Total row)
    let tgsTotalFundsReleased = 0;
    let tgsTotalExpenditure = 0;
    let tgsBalance = 0;
    
    if (tgSummaryData && tgSummaryData.length > 0) {
        tgSummaryData.forEach(row => {
            // Skip Grand Total if it exists
            const isGrandTotal = row['TG'] === 'Grand Total';
            if (!isGrandTotal) {
                // Use Non-Recurring columns
                const fundLimit = parseFloat(row['Non-Recurring - Expenditure Limit']) || 0;
                const fundSpent = parseFloat(row['Non-Recurring - Expenditure Spent']) || 0;
                const balance = parseFloat(row['Non-Recurring - Balance']) || 0;
                
                tgsTotalFundsReleased += fundLimit;
                tgsTotalExpenditure += fundSpent;
                tgsBalance += balance;
            }
        });
    }
    
    console.log('DEBUG: Calculated tgsTotalFundsReleased (Non-Recurring):', tgsTotalFundsReleased, 'tgsTotalExpenditure:', tgsTotalExpenditure, 'tgsBalance:', tgsBalance);
    
    // Add T-Hub row
    const thubRow = document.createElement('tr');
    const thubCells = [
        'T-Hub',
        thubTotalFundsReleased,
        thubTotalExpenditure,
        thubBalance,
        ''
    ];
    
    thubCells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 4) {
            td.textContent = value;
        } else {
            td.className = 'number';
            td.textContent = formatCurrency(value);
        }
        thubRow.appendChild(td);
    });
    tbody.appendChild(thubRow);
    
    // Add TGs row
    const tgsRow = document.createElement('tr');
    const tgsCells = [
        'TGs',
        tgsTotalFundsReleased,
        tgsTotalExpenditure,
        tgsBalance,
        ''
    ];
    
    tgsCells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 4) {
            td.textContent = value;
        } else {
            td.className = 'number';
            td.textContent = formatCurrency(value);
        }
        tgsRow.appendChild(td);
    });
    tbody.appendChild(tgsRow);
    
    // Add Total row
    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = 'bold';
    totalRow.style.backgroundColor = '#e3f2fd';
    
    const totalCells = [
        'Total',
        thubTotalFundsReleased + tgsTotalFundsReleased,
        thubTotalExpenditure + tgsTotalExpenditure,
        thubBalance + tgsBalance,
        ''
    ];
    
    totalCells.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 4) {
            td.textContent = value;
        } else {
            td.className = 'number';
            td.textContent = formatCurrency(value);
        }
        totalRow.appendChild(td);
    });
    tbody.appendChild(totalRow);
    
    // Store data globally for download
    window.thubTgsComparisonDataNonRecurring = {
        toDate: toDate,
        thubFundsReleased: thubTotalFundsReleased,
        thubExpenditure: thubTotalExpenditure,
        thubBalance: thubBalance,
        tgsFundsReleased: tgsTotalFundsReleased,
        tgsExpenditure: tgsTotalExpenditure,
        tgsBalance: tgsBalance,
        totalFundsReleased: (thubTotalFundsReleased + tgsTotalFundsReleased),
        totalExpenditure: (thubTotalExpenditure + tgsTotalExpenditure),
        totalBalance: (thubBalance + tgsBalance),
        thubData: thubSummaryData && thubSummaryData.length > 0,
        tgsData: tgSummaryData && tgSummaryData.length > 0
    };
    
    // Also store in the global variable for downloads
    allComparisonTableDataNonRecurring = [{
        sheetName: 'Total Expenditure (T-Hub & TGs)',
        rows: [
            {
                name: 'T-Hub',
                fundsReleased: thubTotalFundsReleased,
                expenditure: thubTotalExpenditure,
                balance: thubBalance,
                remarks: ''
            },
            {
                name: 'TGs',
                fundsReleased: tgsTotalFundsReleased,
                expenditure: tgsTotalExpenditure,
                balance: tgsBalance,
                remarks: ''
            },
            {
                name: 'Total',
                fundsReleased: (thubTotalFundsReleased + tgsTotalFundsReleased),
                expenditure: (thubTotalExpenditure + tgsTotalExpenditure),
                balance: (thubBalance + tgsBalance),
                remarks: ''
            }
        ]
    }];
    
    console.log('DEBUG: thubTgsComparisonDataNonRecurring stored:', window.thubTgsComparisonDataNonRecurring);
}

// Display T-Hub Totals Table for Non-Recurring
function displayTHubTotalsTableNonRecurring(thubTotalsData, toDate) {
    const section = document.getElementById('thubTotalsSectionNonRecurring');
    if (!section) return;
    
    section.style.display = 'block';
    
    const table = document.getElementById('thubTotalsTableNonRecurring');
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    const headers = [
        { main: 'T-Hub', roman: '(I)' },
        { main: 'Total Funds Released', roman: '(II)' },
        { main: 'Total Expenditure', roman: '(III)' },
        { main: `Balance as on (${toDate || 'DD/MM/YYYY'})`, roman: '(IV = II - III)' },
        { main: 'Remarks', roman: '(if any)' }
    ];
    
    headers.forEach(headerObj => {
        const th = document.createElement('th');
        th.innerHTML = `${headerObj.main}<br/><strong>${headerObj.roman}</strong>`;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Add data rows - filter for Non-Recurring only
    if (thubTotalsData && thubTotalsData.length > 0) {
        // Filter for Non-Recurring rows only
        const nonRecurringRows = thubTotalsData.filter(row => row['Grant Type'] === 'Non-Recurring' && row['Hub'] !== 'Grand Total');
        
        nonRecurringRows.forEach(row => {
            const tr = document.createElement('tr');
            
            const cells = [
                row['Hub'] || '',
                row['Expenditure_Limit'] || '',
                row['Expenditure_Spent'] || '',
                row['Balance'] || '',
                ''
            ];
            
            cells.forEach((value, index) => {
                const td = document.createElement('td');
                if (index > 0 && index < 4) {
                    td.className = 'number';
                    td.textContent = formatCurrency(value);
                } else {
                    td.textContent = value;
                }
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
    }
    
    // Store data globally
    window.thubTotalsDataNonRecurring = thubTotalsData;
    
    // Store in global variable for downloads
    if (thubTotalsData && thubTotalsData.length > 0) {
        const nonRecurringRows = thubTotalsData.filter(row => row['Grant Type'] === 'Non-Recurring' && row['Hub'] !== 'Grand Total');
        allThubSummaryDataNonRecurring = [{
            sheetName: 'T-Hub-Wise Expenditure Summary',
            rows: nonRecurringRows.map(row => ({
                sanctioned_head: row['Hub'] || '',
                total_funds_released: row['Expenditure_Limit'] || 0,
                total_expenditure: row['Expenditure_Spent'] || 0,
                balance: row['Balance'] || 0,
                remarks: ''
            }))
        }];
    }
}

// View switching - Document View, UC View, and Excel View
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        
        // Update active view button
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show/hide view sections
        const documentView = document.getElementById('documentView');
        const ucView = document.getElementById('ucView');
        const excelView = document.getElementById('excelView');
        const downloadBtn = document.getElementById('downloadBtn');
        const downloadAllDocumentBtn = document.getElementById('downloadAllDocumentBtn');
        
        if (view === 'document') {
            documentView.classList.add('active');
            ucView.classList.remove('active');
            excelView.classList.remove('active');
            // Show download all button in document view, hide excel download button
            if (downloadBtn) downloadBtn.style.display = 'none';
            if (downloadAllDocumentBtn) downloadAllDocumentBtn.style.display = 'block';
            // Switch to tgsummary tab in document view
            setTimeout(() => switchToTab('tgsummary'), 50);
        } else if (view === 'uc') {
            documentView.classList.remove('active');
            ucView.classList.add('active');
            excelView.classList.remove('active');
            // Show download all button in UC view, hide excel download button
            if (downloadBtn) downloadBtn.style.display = 'none';
            if (downloadAllDocumentBtn) downloadAllDocumentBtn.style.display = 'block';
            // Switch to ucsummary tab in UC view
            setTimeout(() => switchToTab('ucsummary'), 50);
        } else {
            documentView.classList.remove('active');
            ucView.classList.remove('active');
            excelView.classList.add('active');
            // Show excel download button, hide document download all button
            if (downloadBtn) downloadBtn.style.display = 'block';
            if (downloadAllDocumentBtn) downloadAllDocumentBtn.style.display = 'none';
            // Switch to split tab in excel view
            setTimeout(() => switchToTab('split'), 50);
        }
    });
});

// Tab switching
function switchToTab(tabName) {
    // Get all tab buttons and contents currently visible
    const allTabButtons = document.querySelectorAll('.tab-btn');
    const allTabContents = document.querySelectorAll('.tab-content');
    
    // Remove active class from all buttons and contents
    allTabButtons.forEach(btn => btn.classList.remove('active'));
    allTabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected button and content
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(tabName);
    
    if (targetButton) targetButton.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
}

// Display TG-Wise Summary
function displayTGWiseSummary(tgWiseData, toDate) {
    const container = document.getElementById('tgWiseContainer');
    container.innerHTML = '';
    
    // Sort TG keys
    const sortedTGs = Object.keys(tgWiseData).sort();
    
    sortedTGs.forEach(tg => {
        const data = tgWiseData[tg];
        
        const template = document.createElement('div');
        template.className = 'tg-template';
        
        const header = document.createElement('div');
        header.className = 'tg-template-header';
        header.textContent = data.TG;
        template.appendChild(header);
        
        // Date row
        if (toDate) {
            const dateRow = document.createElement('div');
            dateRow.className = 'tg-template-date';
            dateRow.textContent = `Balance as on: ${toDate}`;
            template.appendChild(dateRow);
        }
        
        // Total Funds Released
        const fundsRow = document.createElement('div');
        fundsRow.className = 'tg-template-row';
        fundsRow.innerHTML = `
            <span class="tg-template-label">Total Funds Released</span>
            <span class="tg-template-value">${formatCurrency(data.Total_Funds_Released)}</span>
        `;
        template.appendChild(fundsRow);
        
        // Total Expenditure
        const expenditureRow = document.createElement('div');
        expenditureRow.className = 'tg-template-row';
        expenditureRow.innerHTML = `
            <span class="tg-template-label">Total Expenditure</span>
            <span class="tg-template-value">${formatCurrency(data.Total_Expenditure)}</span>
        `;
        template.appendChild(expenditureRow);
        
        // Balance
        const balanceRow = document.createElement('div');
        balanceRow.className = 'tg-template-row';
        balanceRow.innerHTML = `
            <span class="tg-template-label">Balance</span>
            <span class="tg-template-value" style="${data.Balance > 0 ? 'color: #00a86b;' : 'color: #dc3545;'}">${formatCurrency(data.Balance)}</span>
        `;
        template.appendChild(balanceRow);
        
        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'tg-download-btn';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
        downloadBtn.addEventListener('click', async () => {
            await downloadTGPDF(data, toDate);
        });
        template.appendChild(downloadBtn);
        
        container.appendChild(template);
    });
}

const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Get all tab buttons and contents
        const allTabButtons = document.querySelectorAll('.tab-btn');
        const allTabContents = document.querySelectorAll('.tab-content');
        
        // Remove active class from all tabs
        allTabButtons.forEach(btn => btn.classList.remove('active'));
        allTabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// Download button
downloadBtn.addEventListener('click', () => {
    window.location.href = '/download';
    showAlert('Downloading file...', 'success');
});

// Download All Document button (for Document View)
const downloadAllDocumentBtn = document.getElementById('downloadAllDocumentBtn');
if (downloadAllDocumentBtn) {
    downloadAllDocumentBtn.addEventListener('click', () => {
        downloadAllTGTables();
    });
}