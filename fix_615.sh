#!/bin/bash
sed -i '613s/    }/      });\n    });\n  }, [payrolls, dateRange, includeDrafts, employees]);/' src/App.tsx
