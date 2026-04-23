# Instructions

In order for this demo to work, you also need to create a backend (like the one you configured in Tutorial 11), which will be a sibling of `frontend`:

```
final-project
├── backend
└── frontend
```

. Specifically:
1. Download api-generator here: https://github.com/csci344/api-generator/archive/refs/heads/main.zip
2. Copy the `api-generator-main` folder into `final-project`
3. Rename `api-generator-main` to `backend`
4. Navigate into the `backend` directory on the command line and install the dependencies: `npm install`
5. Modify the `api.config.yaml` as proposed in part 1 of your assignment (but feel free to adjust your design as needed).
6. Validate, generate, and seed the data:

    ```
    npm validate
    npm generate
    npm seed
    ```
7. Start the backend server: `npm run dev`