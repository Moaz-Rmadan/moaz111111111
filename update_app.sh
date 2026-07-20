#!/bin/bash
sed -i 's/let unsubSuppliers = () => {};/let unsubSuppliers = () => {};\n    let unsubCustomers = () => {};\n    let unsubCustomerPayments = () => {};/g' src/App.tsx

sed -i 's/unsubSuppliers();/unsubSuppliers();\n      unsubCustomers();\n      unsubCustomerPayments();/g' src/App.tsx
