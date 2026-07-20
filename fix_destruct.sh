#!/bin/bash
awk '
/employees,/ { next }
/safeTransactions,/ { next }
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx
