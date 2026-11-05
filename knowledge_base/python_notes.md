# Python Programming Reference Guide

## Chunk: py_intro_01
Title: Python Overview and Execution
Subject: Python
Topic: Introduction
Python is a high-level, interpreted programming language known for its simple syntax and high readability. Python uses an interpreter to run code line by line without prior compilation. The primary execution command in Python is python script.py, and print("Hello World") outputs text to standard output.

## Chunk: py_var_02
Title: Variables and Dynamic Typing
Subject: Python
Topic: Variables
Variables in Python are dynamically typed references to objects in memory. You do not declare variable types explicitly (such as int x = 5). When you assign x = 10, Python creates an integer object 10 and assigns the name x to refer to it. Variable names must start with a letter or underscore and are case-sensitive.

## Chunk: py_types_03
Title: Basic Data Types and Numeric Operators
Subject: Python
Topic: Data Types
Python includes fundamental built-in data types: int for integers, float for decimal numbers, bool for boolean values (True or False), and str for text strings. In Python 3, the regular division operator / always returns a float (for instance, 7 / 2 returns 3.5), while floor division // rounds down to the nearest integer (7 // 2 returns 3), and % computes the remainder.

## Chunk: py_str_04
Title: Strings and Immutability
Subject: Python
Topic: Strings
Strings in Python are ordered sequences of Unicode characters enclosed in single, double, or triple quotes. Strings are immutable, meaning their individual characters cannot be modified in place after creation (e.g., s[0] = 'a' raises a TypeError). Substrings can be sliced using syntax s[start:stop:step] where start is inclusive and stop is exclusive.

## Chunk: py_list_05
Title: Lists and List Operations
Subject: Python
Topic: Lists
A list in Python is an ordered, mutable sequence that can contain items of different data types. Lists are indexed starting from 0. Elements are added with list.append(item) which modifies the list in place and returns None. Slicing a list using list[1:3] returns items at index 1 and 2. Assignment b = a does not copy a list; it creates a reference to the same list. To create an independent copy, use a.copy() or list(a).

## Chunk: py_dict_06
Title: Dictionaries and Key-Value Storage
Subject: Python
Topic: Dictionaries
A dictionary (dict) is an associative mapping of key-value pairs enclosed in curly braces {}. Keys must be immutable and hashable types, such as strings, numbers, or tuples. Values can be of any data type. Accessing a value by key is written as d[key] or d.get(key, default). Dictionaries provide fast O(1) average-time lookups.

## Chunk: py_tuple_set_07
Title: Tuples and Sets
Subject: Python
Topic: Tuples and Sets
Tuples are ordered, immutable sequences defined using parentheses (). Once created, elements of a tuple cannot be changed, added, or removed. Sets are unordered collections of unique elements defined using curly braces {} or set(). Sets do not allow duplicate elements and are optimized for membership testing with the in operator and mathematical set operations like union and intersection.

## Chunk: py_func_08
Title: Functions and Default Arguments
Subject: Python
Topic: Functions
Functions in Python are defined using the def keyword followed by the function name and parameter list. A function returns a value using the return statement; if omitted, it returns None. Default argument values are evaluated once when the function is defined, not on each call. Therefore, using mutable objects like empty lists as default arguments (def f(x=[])) is discouraged because mutations persist across calls.

## Chunk: py_ctrl_09
Title: Control Flow: If Statements and Loops
Subject: Python
Topic: Control Flow
Conditional statements in Python use if, elif, and else blocks with indentation defining the scope. Python offers for loops to iterate over any iterable (like lists, ranges, strings) and while loops to repeat as long as a condition evaluates to True. The range(start, stop) function produces an integer sequence ending at stop - 1. Loop execution can be altered using break to exit immediately and continue to skip to the next iteration.

## Chunk: py_oop_10
Title: Object-Oriented Programming and Classes
Subject: Python
Topic: OOP
Python supports object-oriented programming with classes defined using the class keyword. The initializer method __init__(self, ...) initializes newly created instance attributes. The self parameter references the specific instance of the class. Python supports inheritance, method overriding, and polymorphism. isinstance(obj, ClassName) checks whether an object is an instance or subclass of ClassName.

## Chunk: py_err_11
Title: Exception Handling and Errors
Subject: Python
Topic: Error Handling
Errors in Python are managed with try, except, else, and finally blocks. Code that might raise an exception is placed inside try, while except catches specific exceptions like ValueError or KeyError. The finally block always executes regardless of whether an exception occurred, making it suitable for resource cleanup like closing files.

## Chunk: py_mod_12
Title: Modules, Packages, and Imports
Subject: Python
Topic: Modules
A module in Python is simply a Python file (.py) containing functions, classes, and definitions. Modules are imported using import module_name or from module_name import function_name. When a Python file is run directly, its __name__ variable is set to "__main__", which allows code inside if __name__ == "__main__": to execute only when run directly and not when imported.

