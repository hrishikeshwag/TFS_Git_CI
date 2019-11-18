using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using ConsoleApp_2;

namespace UnitTestProject_for_ConsoleApp2
{
    [TestClass]
    public class UnitTest1 
    {
        [TestMethod]
        public void TestMethod1()
        {
            Class1 c2 = new Class1();
            double result = c2.Addition(5, 5);
            Assert.AreEqual(result, 10);
        }
    }
}
