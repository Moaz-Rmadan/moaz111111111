#!/bin/bash
awk '
/setEditingCustomer\(customer\);/ && !done {
  print "                          <Button variant=\"ghost\" size=\"icon\" className=\"text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50\" onClick={() => setViewingCustomer(customer)}>"
  print "                            <FileText size={16} />"
  print "                          </Button>"
  print $0
  done = 1
  next
}
{ print $0 }
' src/components/CustomersManager.tsx > src/components/CustomersManager.tsx.tmp && mv src/components/CustomersManager.tsx.tmp src/components/CustomersManager.tsx
