document.addEventListener('DOMContentLoaded', function () {
    let elems = document.querySelectorAll('select');
    let instances = M.FormSelect.init(elems);

    document.getElementById('totalValue').addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        value = (value / 100).toFixed(2).replace('.', ',');
        value = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        e.target.value = 'R$ ' + value;
    });
});

function validateAndCalculate() {
    let form = document.getElementById('form');
    if (form.checkValidity()) {
        calculate();
    } else {
        M.toast({ html: 'Por favor, preencha todos os campos antes de calcular.' });
    }
}

function calculate() {
    const value = parseFloat(document.getElementById('totalValue').value.replace('R$', '').replace(/\./g, '').replace(',', '.'));
    const installments = parseInt(document.getElementById('installments').value);
    const discount = parseFloat(document.getElementById('discount').value) / 100;
    const annualCdi = parseFloat(document.getElementById('cdiRate').value) / 100;
    const cdiPercentage = parseFloat(document.getElementById('cdiPercentage').value) / 100;
    const invoiceDay = parseInt(document.getElementById('invoiceDay').value);
    const paymentOption = document.getElementById('paymentOption').value;

    const currentDate = new Date();
    const invoiceDate = getInvoiceDate(currentDate, invoiceDay);

    const cashValue = value * (1 - discount);
    const installmentValue = value / installments;
    const discountValue = value - cashValue;

    let amount = value;
    let totalEarnings = 0;

    if (paymentOption === 'decreasing') {
        totalEarnings = calculateDecreasingEarnings(amount, installments, installmentValue, annualCdi, cdiPercentage, invoiceDate);
    } else if (paymentOption === 'salary') {
        totalEarnings = calculateSalaryEarnings(amount, installments, annualCdi, cdiPercentage);
    }

    const difference = discountValue - totalEarnings;
    const suggestion = difference > 0 ? "Comprar à vista é a melhor opção." : `Comprar à prazo em ${installments} vezes é a melhor opção.`;
    const result = `A diferença entre o valor à vista e o rendimento é de R$ ${Math.abs(difference).toFixed(2).replace('.', ',')}.`;
    const details = generateDetails(discountValue, totalEarnings, result);

    displayResults(suggestion, details);
}

function getInvoiceDate(currentDate, invoiceDay) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    let invoiceDate = new Date(currentYear, currentMonth, invoiceDay);

    if (invoiceDate < currentDate) {
        invoiceDate.setMonth(currentMonth + 1);
    }

    return invoiceDate;
}

function calculateDecreasingEarnings(amount, installments, installmentValue, annualCdi, cdiPercentage, invoiceDate) {
    const businessDaysYear = 252;
    const dailyCdi = Math.pow(1 + (annualCdi * cdiPercentage), 1 / businessDaysYear) - 1;
    let totalEarnings = 0;
    const currentDate = new Date();

    for (let i = 0; i < installments; i++) {
        let daysUntilInvoice = i === 0 ? Math.floor((invoiceDate - currentDate) / (1000 * 60 * 60 * 24)) : 30;
        const earnings = calculateEarnings(amount, dailyCdi, daysUntilInvoice);
        const finalEarnings = calculateFinalEarnings(earnings, daysUntilInvoice);
        amount += finalEarnings - installmentValue;
        totalEarnings += finalEarnings;
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return totalEarnings;
}

function calculateSalaryEarnings(amount, installments, annualCdi, cdiPercentage) {
    const businessDaysYear = 252;
    const dailyCdi = Math.pow(1 + (annualCdi * cdiPercentage), 1 / businessDaysYear) - 1;
    const totalDays = installments * 30;
    const earnings = calculateEarnings(amount, dailyCdi, totalDays);
    return calculateFinalEarnings(earnings, totalDays);
}

function calculateEarnings(amount, dailyCdi, days) {
    return amount * Math.pow(1 + dailyCdi, days) - amount;
}

function calculateFinalEarnings(earnings, days) {
    const irRate = getIrRate(days);
    const netEarnings = earnings * (1 - irRate);
    const iof = days < 30 ? earnings * (30 - days) / 30 * 0.96 : 0;
    return netEarnings - iof;
}

function getIrRate(days) {
    if (days <= 180) return 0.225;
    if (days <= 360) return 0.20;
    if (days <= 720) return 0.175;
    return 0.15;
}

function generateDetails(discountValue, totalEarnings, result) {
    return `
        Desconto à Vista: R$ ${discountValue.toFixed(2).replace('.', ',')}<br>
        Total de Rendimentos do CDB: R$ ${totalEarnings.toFixed(2).replace('.', ',')}<br>
        ${result}
    `;
}

function displayResults(suggestion, details) {
    document.getElementById('result').innerText = suggestion;
    document.getElementById('details').innerHTML = details;
}