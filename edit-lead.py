import time
p='apps/server/src/planner/planner.ts'
s=open(p,encoding='utf8').read()
old="export const isLeadGoal = (goal: string): boolean => /\b(leads?|contacts?|forms?|submit|leaddesk)\b/i.test(goal);"
assert old in s
new="// \"form\" alone is not enough (\"in excel sheet form\" is a format, not a web form); it must be a web form, a lead, or a submit action\nexport const isLeadGoal = (goal: string): boolean => /\b(leads?|leaddesk|submit)\b|\b(?:the|a|web|contact|signup|sign-up|lead)\s+forms?\b|\/app\/(?:form|leads)/i.test(goal);"
s=s.replace(old,new,1)
for i in range(10):
    try:
        open(p,'w',encoding='utf8',newline='\n').write(s);break
    except OSError: time.sleep(1.5)
