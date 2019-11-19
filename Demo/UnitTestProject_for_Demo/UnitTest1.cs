using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Demo;

namespace UnitTestProject_for_Demo
{
    [TestClass]
    public class UnitTest1
    {
        [TestMethod]
        public void TestMethod1()
        {
            Class1 c = new Class1();
            int res = c.Addit(4, 5);
            Assert.AreEqual(9, res);
        }
    }
}
