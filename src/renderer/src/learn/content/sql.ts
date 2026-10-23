import type { ApiDoc, Track } from '@shared/learn'
import { checkpoint, cx, doc, example, requires, text, tip } from './helpers'

const TABLES = `The practice database has four tables:

| Table | Columns |
|---|---|
| «students» | id, name, grade, house, age |
| «scores» | student_id, subject, score |
| «products» | id, name, category, price, stock |
| «orders» | id, product_id, player, quantity |`

export const SQL_DOCS: ApiDoc[] = [
  {
    name: 'SELECT',
    category: 'Reading data',
    signature: 'SELECT column1, column2 FROM table',
    summary: 'Reads rows from a table. «*» means every column. Each SELECT prints a result table.',
    params: [
      { name: 'columns', desc: 'Which columns to show, separated by commas, or «*» for all.' },
      { name: 'table', desc: 'Which table to read from.' }
    ],
    example: 'SELECT name, house FROM students;',
    tips: ['End each statement with «;».', 'SQL keywords are not case sensitive, but writing them in CAPITALS makes queries easier to read.']
  },
  {
    name: 'WHERE',
    category: 'Reading data',
    signature: 'SELECT … FROM table WHERE condition',
    summary: 'Keeps only rows where the condition is true. Compare with «=», «<>» (not equal), «<», «>», «<=», «>=»; combine with «AND», «OR», «NOT»; text goes in single quotes.',
    example: "SELECT name, age FROM students WHERE house = 'Red' AND age >= 16;",
    tips: ["«LIKE 'A%'» matches text starting with A. «IN ('Red', 'Blue')» matches any value in a list. «BETWEEN 10 AND 20» includes both ends."]
  },
  {
    name: 'ORDER BY / LIMIT',
    category: 'Reading data',
    signature: 'ORDER BY column [ASC|DESC] LIMIT n',
    summary: 'Sorts the result (smallest first, or «DESC» for largest first) and keeps only the first «n» rows.',
    example: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 3;',
    tips: ['Without ORDER BY the order of rows is not guaranteed — always sort when order matters.']
  },
  {
    name: 'Aggregates',
    category: 'Summarizing',
    signature: 'COUNT(*), SUM(col), AVG(col), MIN(col), MAX(col)',
    summary: 'Turn many rows into one number. «AS» gives the result column a name.',
    example: 'SELECT COUNT(*) AS students, AVG(age) AS average_age, MAX(grade) AS top_grade FROM students;'
  },
  {
    name: 'GROUP BY / HAVING',
    category: 'Summarizing',
    signature: 'SELECT col, COUNT(*) FROM table GROUP BY col HAVING condition',
    summary: 'Makes one result row per group. «HAVING» filters groups (WHERE filters rows before grouping).',
    example: 'SELECT house, COUNT(*) AS members FROM students GROUP BY house HAVING COUNT(*) >= 3 ORDER BY house;'
  },
  {
    name: 'JOIN',
    category: 'Combining tables',
    signature: 'FROM a JOIN b ON a.col = b.col',
    summary: 'Combines rows from two tables where the ON condition matches. Short table aliases («s», «o») keep queries tidy.',
    example: "SELECT s.name, sc.score\nFROM students s\nJOIN scores sc ON sc.student_id = s.id\nWHERE sc.subject = 'Art'\nORDER BY sc.score DESC;",
    tips: ['«LEFT JOIN» keeps every row from the first table even when nothing matches (the other columns become NULL).']
  },
  {
    name: 'INSERT / UPDATE / DELETE',
    category: 'Changing data',
    signature: 'INSERT INTO t (cols) VALUES (…); UPDATE t SET col = v WHERE …; DELETE FROM t WHERE …',
    summary: 'Add, change and remove rows. **Always** use WHERE with UPDATE and DELETE, or you change every row!',
    example: "INSERT INTO products (name, category, price, stock) VALUES ('Lantern', 'Items', 30, 8);\nUPDATE products SET stock = stock - 1 WHERE name = 'Potion';\nSELECT name, stock FROM products WHERE name IN ('Lantern', 'Potion');"
  },
  {
    name: 'CREATE TABLE',
    category: 'Changing data',
    signature: 'CREATE TABLE name (column TYPE, …)',
    summary: 'Makes a new table. Common types: INTEGER, REAL, TEXT. «PRIMARY KEY» marks the column that identifies each row.',
    example: "CREATE TABLE pets (id INTEGER PRIMARY KEY, name TEXT, species TEXT);\nINSERT INTO pets (name, species) VALUES ('Rex', 'dog'), ('Tom', 'cat');\nSELECT * FROM pets;"
  }
]

const q = (id: string, title: string, prompt: string, solution: string, starter = '-- Write your query here\n', extra = {}) => cx(id, title, prompt, starter, solution, [{ label: 'Query result' }], extra)

export const SQL_BASICS: Track = {
  id: 'sql-basics',
  language: 'sql',
  kind: 'console',
  title: 'SQL Basics',
  tagline: 'Ask questions of data: filter, sort, summarize and join tables. Used by nearly every app and game backend.',
  level: 'Beginner',
  docs: 'sql-basics',
  units: [
    {
      id: 'sq-u1',
      title: 'Reading Data',
      lessons: [
        {
          id: 'sq-1-1',
          title: 'SELECT',
          summary: 'Your first queries.',
          parts: [
            {
              title: 'Tables and queries',
              sections: [
                text(`Data lives in **tables** — like spreadsheets with named columns. A **query** asks the database a question. ${TABLES}`),
                example('SELECT * FROM students;'),
                doc('SELECT'),
                checkpoint(q('sq-1-1-cp1', 'Product names', 'Show the «name» and «price» of every product.', 'SELECT name, price FROM products;'))
              ]
            }
          ],
          exercises: [
            q('sq-1-1-e1', 'Who plays?', 'Show every column of the «orders» table.', 'SELECT * FROM orders;'),
            q('sq-1-1-e2', 'Name and house', 'Show each student’s «name» and «house» (in that order).', 'SELECT name, house FROM students;')
          ]
        },
        {
          id: 'sq-1-2',
          title: 'Filtering with WHERE',
          summary: 'Keep only the rows you want.',
          parts: [{ title: 'WHERE', sections: [doc('WHERE'), tip("Text values need single quotes: «WHERE house = 'Red'». Numbers don't.")] }],
          exercises: [
            q('sq-1-2-e1', 'Red house', "Show the names of students in the «'Red'» house.", "SELECT name FROM students WHERE house = 'Red';"),
            q('sq-1-2-e2', 'Out of stock', 'Show the name of every product whose «stock» is «0».', 'SELECT name FROM products WHERE stock = 0;'),
            q('sq-1-2-e3', 'Cheap weapons', "Show the «name» and «price» of products in the «'Weapons'» category that cost less than «100».", "SELECT name, price FROM products WHERE category = 'Weapons' AND price < 100;", undefined, { points: 2 })
          ]
        },
        {
          id: 'sq-1-3',
          title: 'Sorting and Limiting',
          summary: 'ORDER BY and LIMIT.',
          parts: [{ title: 'ORDER BY', sections: [doc('ORDER BY / LIMIT')] }],
          exercises: [
            q('sq-1-3-e1', 'Youngest first', 'Show the «name» and «age» of all students, youngest first. Break ties by name (A→Z).', 'SELECT name, age FROM students ORDER BY age, name;'),
            q('sq-1-3-e2', 'Top 3 prices', 'Show the «name» and «price» of the 3 most expensive products.', 'SELECT name, price FROM products ORDER BY price DESC LIMIT 3;')
          ]
        }
      ]
    },
    {
      id: 'sq-u2',
      title: 'Summarizing',
      lessons: [
        {
          id: 'sq-2-1',
          title: 'Counting and Averages',
          summary: 'COUNT, SUM, AVG, MIN, MAX.',
          parts: [{ title: 'Aggregates', sections: [doc('Aggregates')] }],
          exercises: [
            q('sq-2-1-e1', 'How many?', 'Count the students in grade «11». Name the column «n».', 'SELECT COUNT(*) AS n FROM students WHERE grade = 11;'),
            q('sq-2-1-e2', 'Stock value', 'Show the total value of all stock (price × stock summed over every product) in a column named «total».', 'SELECT SUM(price * stock) AS total FROM products;', undefined, { points: 2 })
          ]
        },
        {
          id: 'sq-2-2',
          title: 'Grouping',
          summary: 'GROUP BY and HAVING.',
          parts: [{ title: 'GROUP BY', sections: [doc('GROUP BY / HAVING')] }],
          exercises: [
            q('sq-2-2-e1', 'Per category', 'For each product «category», show the category and how many products it has (column «n»). Sort by category.', 'SELECT category, COUNT(*) AS n FROM products GROUP BY category ORDER BY category;'),
            q('sq-2-2-e2', 'Subject averages', 'Show each «subject» and its average score (column «avg_score»), highest average first.', 'SELECT subject, AVG(score) AS avg_score FROM scores GROUP BY subject ORDER BY avg_score DESC;', undefined, { points: 2 })
          ]
        }
      ]
    },
    {
      id: 'sq-u3',
      title: 'Joins and Changes',
      lessons: [
        {
          id: 'sq-3-1',
          title: 'Joining Tables',
          summary: 'Combine related tables.',
          parts: [{ title: 'JOIN', sections: [text('Orders store a «product_id», not the product name. To see names we **join** the two tables on the matching id.'), doc('JOIN')] }],
          exercises: [
            q('sq-3-1-e1', 'Order details', 'Show each order’s «player», the product «name» and the «quantity», sorted by order id.', 'SELECT o.player, p.name, o.quantity FROM orders o JOIN products p ON p.id = o.product_id ORDER BY o.id;'),
            q(
              'sq-3-1-e2',
              'Math stars',
              'Show the «name» and «score» of students who scored 85 or more in «Math», best score first.',
              "SELECT s.name, sc.score FROM students s JOIN scores sc ON sc.student_id = s.id WHERE sc.subject = 'Math' AND sc.score >= 85 ORDER BY sc.score DESC;",
              undefined,
              { points: 2, requires: [requires('\\bJOIN\\b', 'Use a JOIN.')] }
            ),
            q(
              'sq-3-1-e3',
              'Big spenders',
              'Show each «player» and the total they spent (price × quantity, column «spent»), biggest spender first.',
              'SELECT o.player, SUM(p.price * o.quantity) AS spent FROM orders o JOIN products p ON p.id = o.product_id GROUP BY o.player ORDER BY spent DESC;',
              undefined,
              { points: 3 }
            )
          ]
        },
        {
          id: 'sq-3-2',
          title: 'Changing Data',
          summary: 'INSERT, UPDATE, DELETE and CREATE TABLE.',
          parts: [{ title: 'Changing rows', sections: [doc('INSERT / UPDATE / DELETE'), doc('CREATE TABLE')] }],
          exercises: [
            q(
              'sq-3-2-e1',
              'Restock',
              "The «Bow» is out of stock. Set its «stock» to «10», then show the «name» and «stock» of all «'Weapons'» sorted by name.",
              "UPDATE products SET stock = 10 WHERE name = 'Bow';\nSELECT name, stock FROM products WHERE category = 'Weapons' ORDER BY name;",
              undefined,
              { requires: [requires('\\bUPDATE\\b', 'Use UPDATE to change the stock.')] }
            ),
            q(
              'sq-3-2-e2',
              'New student',
              "Add a student named «'Ivy'» in grade «10», house «'Green'», age «15» (let the id fill itself in). Then show the names of all grade-10 students sorted by name.",
              "INSERT INTO students (name, grade, house, age) VALUES ('Ivy', 10, 'Green', 15);\nSELECT name FROM students WHERE grade = 10 ORDER BY name;",
              undefined,
              { requires: [requires('\\bINSERT\\b', 'Use INSERT to add the student.')] }
            )
          ]
        }
      ]
    }
  ]
}
