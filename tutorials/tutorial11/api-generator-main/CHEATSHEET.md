# API Generator Cheat Sheet

> **Your Goal:** Define a backend API by editing **one file**: `api.config.yaml`


## 1. Getting started

### 1.1. First-time setup
1. Download and unzip the code: [https://github.com/csci344/api-generator/archive/refs/heads/main.zip](https://github.com/csci344/api-generator/archive/refs/heads/main.zip)
1. Navigate to the code directory and install the dependencies:
    ```bash
    npm install
    ```

1. Validate the `api.config.yaml`, which is the blueprint for your REST API:
    ```bash
    npm run validate
    npm run generate
    ```
1. Start the node server:
    ```bash
    npm run dev
    ```


Open API docs at `http://localhost:<port>/api/docs`.

### 1.2. Day-to-day workflow

1. Edit `api.config.yaml`
2. Validate and regenerate:

   ```bash
   npm run validate
   npm run generate
   ```

3. Restart the server if needed:

   ```bash
   npm start
   ```

4. Test in `/api/docs`



## 2. How it fits together

### 2.1. Mental model

- `api.config.yaml` = blueprint  
- `npm run generate` = builds your backend  
- `npm start` = runs your server  

### 2.2. Important: `generate` resets your database

Running:

```bash
npm run generate
```

deletes and recreates your database.

- All data is reset  
- Your config file is the source of truth  



## 3. Designing resources in YAML

### 3.1. What to edit (and what to ignore)

<table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
  <colgroup>
    <col style="width: 50%;" />
    <col style="width: 50%;" />
  </colgroup>
  <thead>
    <tr>
      <th scope="col" style="text-align: left; vertical-align: top; padding-right: 1rem;">Edit</th>
      <th scope="col" style="text-align: left; vertical-align: top; border-left: 1px solid rgba(0, 0, 0, 0.12); padding-left: 1rem;">Do not edit</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="vertical-align: top; padding-right: 1rem;">
        <ul>
          <li><code>api.config.yaml</code> (required)</li>
          <li><code>data/sample-data/*.csv</code> (optional)</li>
          <li><code>src/routes/custom.js</code> (optional, advanced)</li>
        </ul>
      </td>
      <td style="vertical-align: top; border-left: 1px solid rgba(0, 0, 0, 0.12); padding-left: 1rem;">
        <ul>
          <li><code>generated/</code></li>
          <li><code>public/_framework/</code></li>
          <li>most of <code>src/</code></li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### 3.2. Basic resource template

```yaml
resources:
  - type: ResourceName
    path: /api/resources
    operations: [list, retrieve, create, update, delete]
    fields:
      - name: fieldName1
        type: string
      - name: fieldName2
        type: integer
        required: true
      - name: fieldName3
        type: integer
        required: true
        query: true
    permissions:
      list: public
      retrieve: public
      create: user
      update: owner
      delete: owner
```

### 3.3. Resources vs fields (terminology)

A **resource** is one kind of data your API exposes as a collection (for example `books` or `sneakers`). In this starter, each resource usually lines up with:

- a **REST path** (`path`, such as `/api/books`)
- a **database table** (name is derived from your resource `type`, e.g. `Sneaker` → `sneakers`)
- a set of **CRUD operations** you enable with `operations`

**Resource-level attributes** describe the whole collection: `type` (PascalCase, e.g. `Sneaker`), `path`, `operations`, `permissions`, optional `shareable`, and the nested `fields` list.

A **field** is one attribute stored on each record (like a column). Every field has at least:

- `name` --  JSON key / column name (do not declare `id` or `owner_id`; the framework adds those when needed)
- `type` -- a scalar type, or another resource’s `type` for a relation (see **Field types** below)
- `required` -- If this is set to true, then the data field is required.
- `query` -- If this is set to true, then your user will be able to filter on this field. For instance, in the query below...

    ```bash
    GET /api/sneakers?brand=nike&is_available=true
    ```

    ...both the `brand` and `is_available` fields' `query` attribute was set to `true`


### 3.4. Field types (scalars and relations)

Every field has a `type`. Use either a **scalar** type or another resource’s **`type` name** for a relation (same PascalCase as that resource’s `type:` in YAML).

**Scalar types**

- `string`  
- `text`  
- `integer`  
- `number`  
- `boolean`  
- `date`  
- `datetime`  
- `image_url`  

**Relation fields** (point to another resource)

- You can also set the `type` to a **related resource’s** `type` (e.g. `Brand`, `Sneaker`).   
- **For Create (POST) and update (PATCH):** Send the related row’s **id** (integer).  
- **For Read (GET):** Responses include a **nested object** for that related record.

Example (a `Sneaker` has a `Brand` associated with it):

```yaml
fields:
  - name: brand
    type: Brand
    required: true
    query: true
```

## 4. Permissions and authentication

### 4.1. Permission policies

| Option | Meaning |
|--|--|
| `public` | anyone |
| `user` | logged-in users |
| `owner` | only creator |
| `owner_or_shared` | owner + shared users |

### 4.2. Testing with auth in `/api/docs`

1. POST `/auth/login`  
2. Copy the token  
3. Click **Authorize** in the docs UI  
4. Paste the token  

### 4.3. Default users

- `admin` / `password`  
- `user` / `password`  



## 5. Optional extensions

### 5.1. Sample data (CSV seed)

After generating:

```bash
npm run seed
```

Loads CSV data from `data/sample-data/` into the database.

### 5.2. Custom Express routes

Edit:

```
src/routes/custom.js
```

Add your own endpoints alongside the generated CRUD routes.



## 6. Troubleshooting and checklist

### 6.1. Common mistakes

- Editing `generated/` (changes will be lost)  
- Forgetting to run `generate`  
- Confusion when data disappears after regenerating  
- Testing protected routes without logging in  

### 6.2. Minimum to succeed

1. Define one or two resources  
2. Add fields  
3. Set permissions  
4. Run `generate`  
5. Test in `/api/docs`  

### 6.3. If you’re stuck

- Did you run `npm run generate`?  
- Does `npm run validate` pass?  
- Are you testing the correct endpoint in `/api/docs`?  
