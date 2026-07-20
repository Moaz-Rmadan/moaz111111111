#!/bin/bash
sed -i 's/const \[costCenters,.*/const [costCenters, setCostCenters] = useState<CostCenter[]>([]);/g' src/App.tsx
