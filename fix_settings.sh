#!/bin/bash
awk '
/showItemAdd=\{showItemAdd\}/ {
  print "            employees={employees}"
  print "            safeTransactions={safeTransactions}"
  print $0
  next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx
