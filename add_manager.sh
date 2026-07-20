#!/bin/bash
# import the component
sed -i '1i import { CustomersManager } from "./components/CustomersManager";' src/App.tsx

# add the tab condition (search for {activeTab === 'sales' && ()
awk '
/\{activeTab === \047sales\047 && \(/ {
  print "        {activeTab === \047customers\047 && <CustomersManager customers={customers} customerPayments={customerPayments} safes={safes} salesOrders={salesOrders} profile={profile} />}"
  print $0
  next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx
