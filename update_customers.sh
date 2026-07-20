#!/bin/bash
awk '
/const \[editingCustomer, setEditingCustomer\]/ {
  print $0
  print "  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);"
  next
}
{ print $0 }
' src/components/CustomersManager.tsx > src/components/CustomersManager.tsx.tmp && mv src/components/CustomersManager.tsx.tmp src/components/CustomersManager.tsx
