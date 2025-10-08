class ApiError extends Error {
    constructer(
        message="something went wrong",
        statusCode,
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