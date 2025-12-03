class ApiError extends Error {
    constructor(
        message="something went wrong",
        statusCode=500,
        errors=[],
        stack=""
    ){
        super(message);
        this.statusCode=statusCode;
        this.errors=errors;
        this.data=null;
        this.success=false;
        if(stack){
            this.stack=stack;
        }
    }
}
export {ApiError};