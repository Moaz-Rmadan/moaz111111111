#!/bin/bash
awk '
/const \[costCenters, / {
  print "  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);"
  next
}
/  employees,/ { next }
/  safeTransactions, setCostCenters/ { next }
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx
