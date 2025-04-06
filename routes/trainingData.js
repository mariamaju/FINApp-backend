// trainingData.js (in the same directory or a dedicated folder like 'data')
const trainingData = [
    {
      prompt: "How can I set my budget plan?",
      response: "You cannot set your budget plan directly through this interface. However, you can view your current budget settings in the budget setting tab located on the right corner of your dashboard."
    },
    {
      prompt: "Tell me about my budget plan.",
      response: "You cannot set your budget plan directly through this interface. However, you can view your current budget settings in the budget setting tab located on the right corner of your dashboard."
    },
    {
      prompt: "Can I analyze my spending trends?",
      response: "You can analyze your spending trends by navigating to the 'Spending Report' section, where you'll find a detailed breakdown of your category-wise spending history. Additionally, the spending tab on the left corner of your dashboard provides an overview of your remaining spendable amount."
    },
    {
      prompt: "Show me my spending trends.",
      response: "You can analyze your spending trends by navigating to the 'Spending Report' section, where you'll find a detailed breakdown of your category-wise spending history. Additionally, the spending tab on the left corner of your dashboard provides an overview of your remaining spendable amount."
    },
    {
      prompt: "What is my daily spend limit?",
      response: "Your daily spending limit is dynamically calculated based on your remaining monthly budget and the number of days left in the current month. You can find the exact figure in the spending tab on your dashboard."
    },
    {
      prompt: "How much can I spend today?",
      response: "Your daily spending limit is dynamically calculated based on your remaining monthly budget and the number of days left in the current month. You can find the exact figure in the spending tab on your dashboard."
    },
    {
      prompt: "How do I add expenses?",
      response: "To add a new expense, please go to the 'Add Expense' section on your dashboard and fill in all the necessary details, such as category, amount, and date."
    },
    {
      prompt: "Where can I add an expense?",
      response: "To add a new expense, please go to the 'Add Expense' section on your dashboard and fill in all the necessary details, such as category, amount, and date."
    },
    {
      prompt: "Can I view my income?",
      response: "You can view a summary of your income in the 'Income Overview' section, which is accessible from your main dashboard."
    },
    {
      prompt: "Show me my income.",
      response: "You can view a summary of your income in the 'Income Overview' section, which is accessible from your main dashboard."
    }
    // Add more training data here as needed, using full prompts
  ];
  
  module.exports = trainingData;