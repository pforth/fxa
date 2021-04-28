# Evaluate Playwright for our functional tests

## Context and Problem Statement

Our functional test suite currently has a 7% success rate when run against our stage environment after a deployment and a 44% success rate when run in CI for pull requests. These low rates are more from flaky tests and a finicky testing stack than legitimate bugs in the code being tested.

In stage this rate is too low to be able to confidently move to a continuous delivery pipeline. In CI it slows down development and decreases morale.

Because of our low success rate for pull requests each PR needs two runs of a relatively expensive task on average. In the last 90 days we used ~1.2M CircleCI credits for PRs. Ideally we could cut that in half.

We should evaluate other testing stack options to improve reliability.

## Goals and Outcomes

- Utilize and be confident in our functional test suite to enable a continuous delivery pipeline
- Increase test suite success rate
- Decrease testing runtime
- Reduce developer time debugging tests
- Improve test suite readability / maintainability
- Reduce test redundancy
- Reduce our CircleCI bill

## Plan of action

1. Implement a proof-of-concept to determine if Playwright can meet the needs of our current test suite. **(Complete)**
2. Create a small test suite of difficult tests in Playwright from ones that have been notoriously flaky with Intern, and run both test stacks repeatedly in CI to evaluate which is more performant and reliable.
3. Determine a winner and write a report of the results so that we can plan our next steps.
