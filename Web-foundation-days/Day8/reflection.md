The most difficult concept in this course was designing for concurrency: two
people may try to reserve the same seat at nearly the same time. At first, I
thought showing an up-to-date seat map would be enough. I understood the problem
better by tracing both requests through the system and identifying the database
as the source of truth. Transactions, row locks or conditional updates, and
unique constraints work together to ensure that only one customer can hold and
buy a seat. Separating a temporary hold from a confirmed purchase also helped
me reason about timeouts and failed payments.

Based on the feedback, I would improve my TicketHub capstone by grounding its
capacity estimates in the provided figures and making assumptions explicit. I
also made fairness clearer by describing how the waiting room admits customers
and limits repeated attempts. I would take this further by testing realistic
page-to-API request patterns, queue behavior, and payment failures instead of
relying on estimates alone.

Next, I want to learn how to load-test a system and use the results to tune its
database, caching, and admission limits. That would help me turn a reasonable
design into one whose performance and fairness are supported by evidence.