#!/bin/bash
awk '
/unsubSuppliers = onSnapshot\(/ {
  print $0
  in_block = 1
  next
}
in_block {
  print $0
  if ($0 ~ /}\)/) {
    in_block = 0
    print "    if (profile.isAdmin || profile.permissions.sales || profile.permissions.reports) {"
    print "      unsubCustomers = onSnapshot("
    print "        collection(db, \047customers\047),"
    print "        (snap) => {"
    print "          setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));"
    print "        },"
    print "        (error) => console.error(\047Permission error in collection customers:\047, error)"
    print "      );"
    print "      unsubCustomerPayments = onSnapshot("
    print "        collection(db, \047customerPayments\047),"
    print "        (snap) => {"
    print "          setCustomerPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerPayment)));"
    print "        },"
    print "        (error) => console.error(\047Permission error in collection customerPayments:\047, error)"
    print "      );"
    print "    }"
  }
  next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx
