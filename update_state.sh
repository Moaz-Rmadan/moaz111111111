#!/bin/bash
sed -i 's/const \[suppliers, setSuppliers\] = useState<Supplier\[\]>(\[\]);/const \[suppliers, setSuppliers\] = useState<Supplier\[\]>(\[\]);\n  const \[customers, setCustomers\] = useState<Customer\[\]>(\[\]);\n  const \[customerPayments, setCustomerPayments\] = useState<CustomerPayment\[\]>(\[\]);/g' src/App.tsx
