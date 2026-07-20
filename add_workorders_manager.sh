#!/bin/bash
# import the component
sed -i '1i import { WorkOrdersManager } from "./components/WorkOrdersManager";' src/App.tsx

# add the tab content
awk '
/\{activeTab === \047customers\047 && \(/ {
  print "        {activeTab === \047workOrders\047 && <WorkOrdersManager customers={customers} profile={profile} />}"
  print $0
  next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

# add the nav button
awk '
/label="العملاء"/ {
  print $0
  print "          <NavButton active={activeTab === \047workOrders\047} onClick={() => handleNavClick(\047workOrders\047)} icon={<ClipboardList size={20} />} label=\"أوامر التشغيل\" permission=\"production\" profile={profile} />"
  next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

