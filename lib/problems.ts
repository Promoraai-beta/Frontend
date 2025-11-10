import type { Problem } from '@/types/assessment';

export const problems: Problem[] = [
  {
    id: 1,
    title: "206. Reverse Linked List",
    difficulty: "Easy",
    description: "Implement a function to reverse a linked list.",
    requirements: [
      "The function should take a linked list node as input",
      "Return the reversed linked list",
      "Handle edge cases (empty list, single node)",
      "Time complexity should be O(n)"
    ],
    starterCode: "function reverseLinkedList(head) {\n  // Your code here\n  return null;\n}",
    testCases: [
      { name: 'Empty list', input: [null], expected: null, visible: true },
      { name: 'Single node', input: [{val: 1, next: null}], expected: {val: 1, next: null}, visible: false },
      { name: 'Multiple nodes', input: [{val: 1, next: {val: 2, next: {val: 3, next: null}}}], expected: {val: 3, next: {val: 2, next: {val: 1, next: null}}}, visible: false }
    ]
  },
  {
    id: 2,
    title: "121. Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    description: "Find the maximum profit from buying and selling a stock.",
    requirements: [
      "Find the best day to buy and sell",
      "You can only make one transaction",
      "Return the maximum profit",
      "If no profit can be made, return 0"
    ],
    starterCode: "function maxProfit(prices) {\n  // Your code here\n  return 0;\n}",
    testCases: [
      { name: 'Example 1', input: [[7,1,5,3,6,4]], expected: 5, visible: true },
      { name: 'No profit', input: [[7,6,4,3,1]], expected: 0, visible: true },
      { name: 'Single price', input: [[5]], expected: 0, visible: false },
      { name: 'Large array', input: [[3,3,5,0,0,3,1,4]], expected: 4, visible: false },
      { name: 'All same', input: [[1,1,1,1]], expected: 0, visible: false }
    ]
  },
  {
    id: 3,
    title: "3. Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    description: "Find the length of the longest substring without repeating characters.",
    requirements: [
      "Return the length of the longest substring",
      "Substring should not have repeating characters",
      "Handle edge cases (empty string, all same characters)"
    ],
    starterCode: "function lengthOfLongestSubstring(s) {\n  // Your code here\n  return 0;\n}",
    testCases: [
      { name: 'abcabcbb', input: ['abcabcbb'], expected: 3, visible: true },
      { name: 'bbbbb', input: ['bbbbb'], expected: 1, visible: true },
      { name: 'pwwkew', input: ['pwwkew'], expected: 3, visible: true },
      { name: 'Empty string', input: [''], expected: 0, visible: false },
      { name: 'Single char', input: ['a'], expected: 1, visible: false },
      { name: 'All unique', input: ['abcdef'], expected: 6, visible: false },
      { name: 'Complex case', input: ['dvdf'], expected: 3, visible: false }
    ]
  }
];

