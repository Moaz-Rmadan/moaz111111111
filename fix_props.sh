#!/bin/bash
awk '
/employees=\{employees\}/ { next }
/safeTransactions=\{safeTransactions\}/ { next }
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx
